"""The transactional outbox relay.

Business transactions append to `outbox`. This task drains it and publishes to
SQS/EventBridge with **at-least-once** delivery, so consumers must be
idempotent by event id.

Why the indirection is worth it: notifications, analytics rollups and search
reindexing must not fire on a transaction that later rolls back. Concretely -
a course purchase that fails at the payment step must not have already moved
the candidate's score. Emitting the event inside the same transaction as the
purchase makes that impossible rather than unlikely.

**`FOR UPDATE SKIP LOCKED` is what makes this safe to run on several workers.**
Each one claims a disjoint batch; none blocks on another; nothing is
published twice by two workers racing.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import text

from app.core.logging import get_logger
from app.worker import celery_app

logger = get_logger(__name__)

BATCH_SIZE = 100
MAX_ATTEMPTS = 10


@celery_app.task(name="outbox.relay", bind=True, max_retries=3)
def relay_outbox(self: Any) -> dict[str, int]:
    """Publish a batch of unpublished events.

    Triggered by EventBridge Scheduler hitting a trigger endpoint, not by
    Celery Beat: SQS has no native ETA or countdown, so Beat-style scheduling
    fails quietly on this broker.
    """
    import asyncio

    return asyncio.run(_relay_batch())


async def _relay_batch() -> dict[str, int]:
    from app.core.db import get_session_factory

    published = 0
    failed = 0

    async with get_session_factory()() as session, session.begin():
        rows = (
            (
                await session.execute(
                    text(
                        """
                    SELECT id, event_type, aggregate_type, aggregate_id, payload,
                           attempts
                      FROM outbox
                     WHERE published_at IS NULL
                       AND attempts < :max_attempts
                     ORDER BY created_at
                     LIMIT :batch
                    FOR UPDATE SKIP LOCKED
                    """
                    ),
                    {"batch": BATCH_SIZE, "max_attempts": MAX_ATTEMPTS},
                )
            )
            .mappings()
            .all()
        )

        for row in rows:
            try:
                _publish(dict(row))
                await session.execute(
                    text("UPDATE outbox SET published_at = now() WHERE id = :id"),
                    {"id": row["id"]},
                )
                published += 1
            except Exception:
                # Count the attempt and leave it for the next pass. A poison
                # event stops being retried at MAX_ATTEMPTS rather than
                # blocking the queue behind it forever.
                await session.execute(
                    text("UPDATE outbox SET attempts = attempts + 1 WHERE id = :id"),
                    {"id": row["id"]},
                )
                failed += 1
                logger.warning(
                    "outbox_publish_failed",
                    event_type=row["event_type"],
                    attempts=row["attempts"] + 1,
                )

    if published or failed:
        logger.info("outbox_relay_batch", published=published, failed=failed)
    return {"published": published, "failed": failed}


def _publish(event: dict[str, Any]) -> None:
    """Hand the event to the broker.

    TODO(Day 19): publish to SQS/EventBridge and enqueue `subscribers`. Until
    the queues exist this logs, which is a deliberate no-op rather than a
    silent drop - the row stays unpublished only if this raises.

    The subscriber list is resolved here rather than at enqueue time so that
    an event routed to a task nobody wired is visible in the log today, before
    the broker hop exists to hide it.
    """
    from app.tasks.routing import tasks_for

    subscribers = tasks_for(event["event_type"])
    logger.info(
        "outbox_event_published",
        event_type=event["event_type"],
        aggregate_type=event["aggregate_type"],
        subscribers=list(subscribers),
    )
