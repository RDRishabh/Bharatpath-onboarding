"""Recompute a candidate's score after their resume is confirmed.

Runs out of band because Layer 1 calls a model: seconds, not milliseconds, and
billable. The confirm request returns immediately and this finishes the work.

**Triggered by `resume.version_confirmed`, never by `resume.version_created`.**
That is the confirm gate (SRS 1.4.4) expressed as a subscription: the creation
event fires on every parse and every correction, including ones the candidate
has never reviewed, so consuming it would score unreviewed content while every
test still passed. `tests/invariants/test_confirm_gate.py` fails the build if
anything under `app/modules/scoring/` so much as names the creation event --
which is why this task lives in `app/tasks/` and reaches scoring through its
service, exactly as the outbox relay reaches every other module.

**Idempotent by resume version.** The outbox relays at-least-once, so this
task will be handed the same confirmation again. A second delivery finds a
score already computed for that version and stops: two score rows for one
resume would both be "current" depending on which query won.
"""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.worker import celery_app

logger = get_logger(__name__)


@celery_app.task(name="scoring.score_resume", bind=True, max_retries=5)
def score_resume(self: Any, user_id: str, resume_version_id: str) -> dict[str, Any]:
    """Entry point. Retries on infrastructure failure, never on a bad resume.

    The retry budget is larger than the parse task's because the failure this
    guards against is different: a model that is rate-limited or briefly
    unavailable will succeed on the next attempt, and the candidate is waiting
    on a number rather than on a document.
    """
    import asyncio

    return asyncio.run(_score(user_id, resume_version_id))


async def _score(user_id: str, resume_version_id: str) -> dict[str, Any]:
    import uuid

    from app.core.db import get_session_factory
    from app.modules.resume.service import ResumeNotConfirmedError
    from app.modules.scoring import service
    from app.modules.scoring.extractor import ExtractionError

    uid = uuid.UUID(user_id)
    version_id = uuid.UUID(resume_version_id)

    async with get_session_factory()() as session, session.begin():
        # At-least-once delivery. One confirmed version gets one score.
        existing = await service.score_for_version(session, resume_version_id=version_id)
        if existing is not None:
            logger.info(
                "score_skipped_already_computed",
                resume_version_id=resume_version_id,
                score_id=str(existing.id),
            )
            return {"status": "already_scored", "score_id": str(existing.id)}

        try:
            result = await service.score_confirmed_resume(session, user_id=uid)
        except ResumeNotConfirmedError:
            # The version was superseded and the newer one is not confirmed
            # yet, or the row went away. Ordinary, and not worth a retry: the
            # next confirmation emits its own event.
            logger.info("score_skipped_not_confirmed", user_id=user_id)
            return {"status": "not_confirmed"}
        except ExtractionError as exc:
            # **The score stays pending.** No partial, no degraded number.
            # Re-raised so Celery retries with backoff; after the budget is
            # exhausted it dead-letters and a human looks at it.
            logger.warning("score_extraction_failed", user_id=user_id, code=exc.code)
            raise

        logger.info(
            "score_computed",
            user_id=user_id,
            score_id=str(result.score_id),
            value=result.raw_value,
        )
        return {"status": "scored", "score_id": str(result.score_id), "value": result.raw_value}
