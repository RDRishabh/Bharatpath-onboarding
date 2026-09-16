"""Expire applications an employer has abandoned (SRS 1.9.3).

Periodic, so it is started by EventBridge Scheduler rather than Celery Beat
(`app/worker.py`). **The schedule itself is not provisioned yet** -- it lands
with the rest of the deployment infrastructure (`docs/blockers.md` E4). Until
then nothing expires on its own, which is the safe direction: an application
left open is a candidate kept waiting, not a candidate wrongly released.

**One transaction per employer.** Each binds that tenant, so the sweep reads
and writes under the same Row-Level Security policy as every request, can only
touch the tenant it is in, and a failure in one organisation's pipeline does
not roll back another's.

**Idempotent, and safe to run on several workers.** An application already
expired is terminal and never selected again; rows are claimed with
`SKIP LOCKED`, so two sweeps share the work instead of expiring a row twice.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.core.logging import get_logger
from app.worker import celery_app

logger = get_logger(__name__)


@celery_app.task(name="applications.expire", bind=True, max_retries=3)
def expire_applications(self: Any) -> dict[str, int]:
    """Entry point. The clock is read once, so every tenant in one sweep is
    judged against the same instant."""
    import asyncio

    return asyncio.run(sweep(now=datetime.now(UTC)))


async def sweep(*, now: datetime) -> dict[str, int]:
    from app.core.db import get_session_factory
    from app.modules.applications import service as applications_service
    from app.modules.identity import service as identity_service

    factory = get_session_factory()
    async with factory() as session, session.begin():
        tenant_ids = await identity_service.employer_tenant_ids(session)

    expired = 0
    for tenant_id in tenant_ids:
        async with factory() as session, session.begin():
            expired += await applications_service.expire_for_tenant(
                session, tenant_id=tenant_id, now=now
            )

    logger.info("application_expiry_sweep", tenants=len(tenant_ids), expired=expired)
    return {"tenants": len(tenant_ids), "expired": expired}
