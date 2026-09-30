"""Forget the days a candidate opened the app, once they are a year old.

The client's retention for the streak calendar (2026-09-29): one year, then
gone. `engagement.domain.ACTIVITY_RETENTION_DAYS` is the number, and
`purge_streak_activity_days` holds it in SQL and picks the cut-off itself.

Daily, just after midnight IST, when the window has moved by a day.
Idempotent: a second run the same day finds nothing older to delete.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.core.logging import get_logger
from app.tasks.async_runner import run_async
from app.worker import celery_app

logger = get_logger(__name__)


@celery_app.task(name="engagement.purge_expired_activity", bind=True, max_retries=3)
def purge_expired_activity(self: Any) -> dict[str, int]:
    return run_async(run(now=datetime.now(UTC)))


async def run(*, now: datetime) -> dict[str, int]:
    from app.core.db import get_session_factory
    from app.modules.engagement import service as engagement_service

    async with get_session_factory()() as session, session.begin():
        deleted = await engagement_service.purge_expired_activity(session, now=now)
    logger.info("streak_activity_purged", deleted=deleted)
    return {"deleted": deleted}
