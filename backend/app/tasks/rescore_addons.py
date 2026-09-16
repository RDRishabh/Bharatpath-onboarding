"""Re-score a candidate after an add-on completion.

Add-ons move the score (R1). Triggered by `courses.completion_recorded` (and
`interview.session_completed` from Day 16). **Never calls the model**: Layers
2 and 3 run over the extraction stored on the latest score
(`scoring.service.rescore_for_addons`).

Lives in `app/tasks/` and reaches scoring through its service, because the
add-on modules may not import scoring (invariant 4').

**Idempotent**: a redelivered event finds the latest score already carrying
exactly these contributions and appends nothing.
"""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.worker import celery_app

logger = get_logger(__name__)


@celery_app.task(name="scoring.rescore_for_addons", bind=True, max_retries=5)
def rescore_for_addons(self: Any, user_id: str) -> dict[str, Any]:
    import asyncio

    return asyncio.run(_rescore(user_id))


async def _rescore(user_id: str) -> dict[str, Any]:
    import uuid

    from app.core.db import get_session_factory
    from app.modules.scoring import service

    async with get_session_factory()() as session, session.begin():
        result = await service.rescore_for_addons(session, user_id=uuid.UUID(user_id))
    if result is None:
        return {"status": "unchanged"}
    logger.info("score_rescored_for_addons", score_id=str(result.score_id))
    return {"status": "scored", "score_id": str(result.score_id), "value": result.raw_value}
