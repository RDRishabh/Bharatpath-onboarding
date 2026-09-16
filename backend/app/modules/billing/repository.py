"""billing - data access

Payments, entitlements, signed callbacks.

All database access for this module lives here. Private to the module:
no other module may import it (import-linter contract `module-privacy`).

No delete function, for either table. Payments are the financial record the
deletion carve-out keeps (blockers B3), and callbacks are evidence.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.billing.models import Payment, PaymentCallback


async def lock_checkout(session: AsyncSession, *, user_id: uuid.UUID, item_id: uuid.UUID) -> None:
    """Serialise checkouts for one payer and one item, so a double tap finds
    the first pending payment instead of racing it to open a second order."""
    await session.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
        {"key": f"checkout:{user_id}:{item_id}"},
    )


async def reusable_pending_payment(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    purpose: str,
    item_id: uuid.UUID,
    amount_minor: int,
    provider: str,
    since: datetime,
) -> Payment | None:
    result = await session.execute(
        select(Payment)
        .where(
            Payment.user_id == user_id,
            Payment.purpose == purpose,
            Payment.item_id == item_id,
            Payment.status == "PENDING",
            Payment.amount_minor == amount_minor,
            Payment.provider == provider,
            Payment.created_at >= since,
        )
        .order_by(Payment.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def insert_payment(
    session: AsyncSession,
    *,
    payment_id: uuid.UUID,
    user_id: uuid.UUID,
    provider: str,
    provider_ref: str,
    amount_minor: int,
    purpose: str,
    item_code: str,
    item_id: uuid.UUID,
    subscriber_type: str | None,
    subscriber_id: uuid.UUID | None,
    subscription_id: uuid.UUID | None,
    checkout_url: str | None,
) -> Payment:
    """Always PENDING and unverified. The database refuses anything else."""
    row = Payment(
        id=payment_id,
        user_id=user_id,
        provider=provider,
        provider_ref=provider_ref,
        amount_minor=amount_minor,
        currency="INR",
        status="PENDING",
        purpose=purpose,
        item_code=item_code,
        item_id=item_id,
        subscriber_type=subscriber_type,
        subscriber_id=subscriber_id,
        subscription_id=subscription_id,
        checkout_url=checkout_url,
    )
    session.add(row)
    await session.flush()
    return row


async def get_payment(session: AsyncSession, *, payment_id: uuid.UUID) -> Payment | None:
    return await session.get(Payment, payment_id)


async def lock_payment_by_ref(
    session: AsyncSession, *, provider: str, provider_ref: str
) -> Payment | None:
    result = await session.execute(
        select(Payment)
        .where(Payment.provider == provider, Payment.provider_ref == provider_ref)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


async def insert_callback(
    session: AsyncSession,
    *,
    provider: str,
    event_id: str,
    event_type: str,
    payload: dict[str, Any],
    verified_at: datetime,
) -> uuid.UUID | None:
    """Store a verified callback. None if this event was already received --
    that is the replay protection."""
    result = await session.execute(
        pg_insert(PaymentCallback)
        .values(
            id=uuid.uuid4(),
            provider=provider,
            event_id=event_id,
            event_type=event_type,
            payload=payload,
            signature_verified_at=verified_at,
        )
        .on_conflict_do_nothing(constraint="uq_payment_callback_event")
        .returning(PaymentCallback.id)
    )
    return result.scalar_one_or_none()


async def lock_callback(session: AsyncSession, *, callback_id: uuid.UUID) -> PaymentCallback | None:
    result = await session.execute(
        select(PaymentCallback)
        .where(PaymentCallback.id == callback_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


async def mark_callback_processed(
    session: AsyncSession, row: PaymentCallback, *, outcome: str, now: datetime
) -> None:
    """The two columns the app role may update on this table."""
    row.processed_at = now
    row.outcome = outcome
    await session.flush()
