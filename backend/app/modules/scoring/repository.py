"""scoring - data access

Engine interface, versions, history, breakdown.

All database access for this module lives here. Private to the module:
no other module may import it (import-linter contract `module-privacy`).

**Two tables, two very different lifecycles.** `scores` is append-only -- the
application role has no UPDATE and no DELETE on it, and "score history" is
simply every row. `resume_extractions` is content-addressed and therefore
immutable by construction: a row's key is a hash of everything that produced
it, so a second write for the same key is always the same bytes.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.scoring.models import ResumeExtraction, Score


# ---------------------------------------------------------------------------
# The extraction cache (scoring-approach.md section 6)
# ---------------------------------------------------------------------------
async def get_extraction(session: AsyncSession, *, cache_key: str) -> ResumeExtraction | None:
    """Look up a stored extraction by content hash.

    A hit means the model is not called: same CV, same model, same prompt,
    same schema -- so the same facts, and therefore the same score. That is
    what makes cross-candidate consistency exact rather than probabilistic,
    and what makes re-scoring after a course purchase free.
    """
    return await session.get(ResumeExtraction, cache_key)


async def put_extraction(
    session: AsyncSession,
    *,
    cache_key: str,
    model_id: str,
    prompt_version: str,
    schema_version: str,
    raw_response: dict[str, Any],
    extracted_features: dict[str, Any],
) -> None:
    """Store an extraction, ignoring a key that is already there.

    `ON CONFLICT DO NOTHING` rather than an upsert, and the distinction
    matters: the key is a hash of the text, model, prompt and schema, so a
    conflict means an identical input produced this row. Overwriting would
    replace one valid extraction with another and silently change every score
    that had already been computed from the first.

    Two workers racing on the same new CV is ordinary -- both calls succeed,
    one row exists, and whichever response won is the one every future replay
    reads.
    """
    await session.execute(
        pg_insert(ResumeExtraction)
        .values(
            cache_key=cache_key,
            model_id=model_id,
            prompt_version=prompt_version,
            schema_version=schema_version,
            raw_response=raw_response,
            extracted_features=extracted_features,
        )
        .on_conflict_do_nothing(index_elements=["cache_key"])
    )


# ---------------------------------------------------------------------------
# Scores. INSERT only - there is deliberately no update and no delete.
# ---------------------------------------------------------------------------
async def insert_score(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    resume_version_id: uuid.UUID,
    algorithm_version: str,
    raw_value: int,
    base_value: int,
    addon_value: int,
    contributing_events: list[dict[str, Any]],
    contribution_version: str,
    breakdown: dict[str, Any],
    model_id: str | None,
    prompt_version: str | None,
    prompt_hash: str | None,
    raw_model_response: dict[str, Any] | None,
    extracted_features: dict[str, Any] | None,
    taxonomy_version: str | None,
    rubric_version: str | None,
    extraction_cache_key: str | None,
) -> Score:
    """Append one score. **The only write path to this table.**

    Invariant 3 -- a score is not human-editable, directly or indirectly -- is
    enforced by there being no other function here, by the app role holding no
    UPDATE or DELETE grant, and by `test_scores_are_insert_only` proving the
    grant rather than trusting it.

    Every argument is required, including the ones that may be None. A score
    row that omitted its model or prompt version would be a score nobody could
    replay, and defaulting them would let that happen quietly.
    """
    row = Score(
        user_id=user_id,
        resume_version_id=resume_version_id,
        algorithm_version=algorithm_version,
        raw_value=raw_value,
        base_value=base_value,
        addon_value=addon_value,
        contributing_events=contributing_events,
        contribution_version=contribution_version,
        breakdown=breakdown,
        model_id=model_id,
        prompt_version=prompt_version,
        prompt_hash=prompt_hash,
        raw_model_response=raw_model_response,
        extracted_features=extracted_features,
        taxonomy_version=taxonomy_version,
        rubric_version=rubric_version,
        extraction_cache_key=extraction_cache_key,
    )
    session.add(row)
    await session.flush()
    return row


async def get_score(session: AsyncSession, *, score_id: uuid.UUID) -> Score | None:
    """One score by id, unscoped.

    Replay and admin drill-down both reach a score by id without a user in
    hand; the caller applies the ownership rule. Every candidate-facing route
    goes through `latest_score`, which is scoped.
    """
    return await session.get(Score, score_id)


async def latest_score(session: AsyncSession, *, user_id: uuid.UUID) -> Score | None:
    """The candidate's current score: the most recently computed row.

    Ordered by `computed_at` then `id` so two rows written inside the same
    transaction -- same clock reading -- still have a stable winner rather
    than an arbitrary one.
    """
    result = await session.execute(
        select(Score)
        .where(Score.user_id == user_id)
        .order_by(Score.computed_at.desc(), Score.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def score_for_resume_version(
    session: AsyncSession, *, resume_version_id: uuid.UUID
) -> Score | None:
    """Any score already computed for this resume version.

    The idempotency key for the recalculation task: the outbox relays
    at-least-once, and a second delivery must not append a duplicate score for
    a version whose inputs have not changed.
    """
    result = await session.execute(
        select(Score)
        .where(Score.resume_version_id == resume_version_id)
        .order_by(Score.computed_at.desc(), Score.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
