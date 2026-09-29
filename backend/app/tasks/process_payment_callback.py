"""Settle a payment from a verified, stored gateway callback.

The callback route verifies the signature, stores the payload and answers the
gateway at once; this does the rest, out of band, so a slow grant never makes
a gateway retry. Triggered by `billing.callback_received`.

**Idempotent by callback.** A processed callback keeps its recorded outcome
and is not applied again, and a second callback about the same payment finds
it already settled. The outbox relays at least once; both are expected.
"""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.tasks.async_runner import run_async
from app.worker import celery_app

logger = get_logger(__name__)


@celery_app.task(name="billing.process_callback", bind=True, max_retries=5)
def process_payment_callback(self: Any, callback_id: str) -> dict[str, str]:
    return run_async(_process(callback_id))


async def _process(callback_id: str) -> dict[str, str]:
    import uuid

    from app.core.db import get_session_factory
    from app.modules.billing import service

    async with get_session_factory()() as session, session.begin():
        outcome = await service.process_callback(session, callback_id=uuid.UUID(callback_id))
    logger.info("payment_callback_task_done", outcome=outcome)
    return {"outcome": outcome}
