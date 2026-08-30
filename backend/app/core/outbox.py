"""Transactional outbox writer and relay.

Domain events are appended inside the business transaction. A relay task polls
and publishes to SQS/EventBridge with at-least-once delivery; consumers are
idempotent by event id.

This is what makes "a rolled-back purchase never moves a score" true rather
than hopeful - the score recalculation is triggered by an outbox row that only
exists if the purchase committed.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.models import OutboxEvent


async def emit(
    session: AsyncSession,
    *,
    event_type: str,
    aggregate_type: str,
    aggregate_id: UUID | str,
    payload: dict[str, Any],
) -> None:
    """Append a domain event on the caller's transaction.

    Takes the caller's session for the same reason `audit_event` does: a
    separate transaction here would let the event publish while the business
    change rolled back.
    """
    await session.execute(
        insert(OutboxEvent).values(
            event_type=event_type,
            aggregate_type=aggregate_type,
            aggregate_id=str(aggregate_id),
            payload=payload,
        )
    )
