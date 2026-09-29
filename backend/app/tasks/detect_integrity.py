"""Run the integrity rules over a newly scored resume version.

Triggered by `scoring.score_computed` (`app/tasks/routing.py`), with the
event's aggregate id -- the score id. By then both inputs exist: the CV text
on the resume version, and the Layer 1 extraction stored on the score row.

**This task reads a score and never writes one** (SRS 1.4.5). It lives in
`app/tasks/` because it has to read from `scoring` and `resume` and hand the
result to `integrity`, and `integrity` itself may not import `scoring`. It is
handed `scoring.service.get_score` and nothing else from that module, and
`test_discovery_suppression.py` fails the build if it ever names a scoring
write path.

**Idempotent by resume version.** The outbox delivers at least once; the
second delivery finds the check already recorded and writes nothing.
"""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.tasks.async_runner import run_async
from app.worker import celery_app

logger = get_logger(__name__)


@celery_app.task(name="integrity.detect", bind=True, max_retries=3)
def detect_integrity(self: Any, score_id: str) -> dict[str, Any]:
    """Entry point. Retries on infrastructure failure only -- the rules are
    pure, so a CV that produced a result once produces the same one again."""
    return run_async(_detect(score_id))


async def _detect(score_id: str) -> dict[str, Any]:
    import uuid

    from app.core.db import get_session_factory
    from app.modules.integrity import service as integrity_service
    from app.modules.resume import service as resume_service
    from app.modules.resume.hidden_text import hidden_text_of
    from app.modules.resume.service import VersionNotFoundError
    from app.modules.scoring import service as scoring_service

    async with get_session_factory()() as session, session.begin():
        score = await scoring_service.get_score(session, score_id=uuid.UUID(score_id))
        if score is None:
            logger.warning("integrity_skipped_missing_score", score_id=score_id)
            return {"status": "missing"}

        try:
            version, _superseded = await resume_service.get_version_for_review(
                session, user_id=score.user_id, resume_version_id=score.resume_version_id
            )
        except VersionNotFoundError:
            # Deleted between scoring and this task -- a deletion request that
            # landed first. Nothing to check, and nothing to show anyone.
            logger.info("integrity_skipped_missing_version", score_id=score_id)
            return {"status": "version_missing"}

        parsed = version.parsed if isinstance(version.parsed, dict) else {}
        raw_text = parsed.get("raw_text")
        extracted = score.extracted_features if isinstance(score.extracted_features, dict) else {}

        result = await integrity_service.evaluate_version(
            session,
            candidate_id=score.user_id,
            resume_version_id=score.resume_version_id,
            extracted=extracted,
            # `raw_text` is everything pypdf read, hidden text included -- it
            # has no notion of the difference, which is why the hidden part is
            # identified separately rather than subtracted here. Passing the
            # whole document as `visible_text` is therefore correct: it is
            # what a reader plus a reader-of-the-file would between them see.
            visible_text=raw_text if isinstance(raw_text, str) else "",
            # Blockers E5, closed 2026-09-22. Empty for versions created
            # before then, for a failed analysis, and for a clean CV alike
            # (`hidden_text_of`); the distinction lives in the stored record,
            # not in what the rules are handed.
            hidden_text=hidden_text_of(parsed),
            as_of=score.computed_at,
        )

    return {
        "status": "already_evaluated" if result.already_evaluated else "evaluated",
        "signal_count": result.signal_count,
        "highest_severity": result.highest_severity,
        "suppresses": result.suppresses,
    }
