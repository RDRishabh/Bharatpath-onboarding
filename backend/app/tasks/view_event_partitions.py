"""Keep `candidate_view_events` partitioned ahead of the calendar (invariant 7').

Periodic, so it is started by EventBridge Scheduler rather than Celery Beat
(`app/worker.py`), and **the schedule is not provisioned yet** (blockers E4).
That is survivable by design: the baseline creates fifteen months of
partitions, and a month nobody created lands in the DEFAULT partition rather
than refusing a reveal. Run monthly once scheduling exists.

Idempotent: a partition that exists is left alone, so several workers or a
retried run create nothing twice.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.core.logging import get_logger
from app.tasks.async_runner import run_async
from app.worker import celery_app

logger = get_logger(__name__)


@celery_app.task(name="discovery.ensure_view_partitions", bind=True, max_retries=3)
def ensure_view_partitions(self: Any) -> dict[str, int]:
    return run_async(run(now=datetime.now(UTC)))


async def run(*, now: datetime) -> dict[str, int]:
    from app.core.db import get_session_factory
    from app.modules.discovery import service as discovery_service

    async with get_session_factory()() as session, session.begin():
        created = await discovery_service.ensure_view_partitions(session, now=now)
    logger.info("view_event_partitions_ensured", created=created)
    return {"created": created}
