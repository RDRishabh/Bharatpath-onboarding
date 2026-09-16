"""subscriptions - data access

Plans, periods, renewal, cancellation, seats.

All database access for this module lives here. Private to the module:
no other module may import it (import-linter contract `module-privacy`).

There is no delete function in this file, for any table. `subscription_events`
is append-only (no UPDATE or DELETE grant); subscriptions, mandates and
notices lose only DELETE, because their state moves.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import or_, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.models import ConfigValue
from app.modules.subscriptions.domain import LIVE_STATES
from app.modules.subscriptions.models import (
    MandateDebitNotice,
    Plan,
    Subscription,
    SubscriptionEvent,
    UpiMandate,
)

#: A mandate that can still debit, or is waiting for the payer to authorise.
OPEN_MANDATE_STATES = ("PENDING", "ACTIVE")


async def current_config(session: AsyncSession, *, key: str, now: datetime) -> ConfigValue | None:
    result = await session.execute(
        select(ConfigValue)
        .where(ConfigValue.key == key, ConfigValue.effective_from <= now)
        .order_by(ConfigValue.version.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


# --- plans ---------------------------------------------------------------------
async def list_active_plans(session: AsyncSession, *, audience: str) -> list[Plan]:
    result = await session.execute(
        select(Plan)
        .where(Plan.audience == audience, Plan.active.is_(True))
        .order_by(Plan.price_minor, Plan.code)
    )
    return list(result.scalars())


async def active_plan_by_code(session: AsyncSession, *, code: str, audience: str) -> Plan | None:
    result = await session.execute(
        select(Plan)
        .where(Plan.code == code, Plan.audience == audience, Plan.active.is_(True))
        .order_by(Plan.version.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_plan(session: AsyncSession, *, plan_id: uuid.UUID) -> Plan | None:
    return await session.get(Plan, plan_id)


async def latest_plan_version(session: AsyncSession, *, code: str) -> Plan | None:
    result = await session.execute(
        select(Plan).where(Plan.code == code).order_by(Plan.version.desc()).limit(1)
    )
    return result.scalar_one_or_none()


async def insert_plan(
    session: AsyncSession,
    *,
    code: str,
    audience: str,
    period: str,
    price_minor: int,
    seat_allowance: int | None,
    active: bool,
    version: int,
) -> Plan:
    row = Plan(
        code=code,
        audience=audience,
        period=period,
        price_minor=price_minor,
        seat_allowance=seat_allowance,
        active=active,
        version=version,
    )
    session.add(row)
    await session.flush()
    return row


# --- subscriptions -------------------------------------------------------------
async def lock_subscriber(
    session: AsyncSession, *, subscriber_type: str, subscriber_id: uuid.UUID
) -> None:
    """Serialise changes to one subscriber for this transaction.

    Two callbacks for two checkouts can settle at once, and with no live row
    yet there is nothing for `FOR UPDATE` to lock -- both would open a tenure.
    """
    await session.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
        {"key": f"subscriber:{subscriber_type}:{subscriber_id}"},
    )


async def live_subscription_for_update(
    session: AsyncSession, *, subscriber_type: str, subscriber_id: uuid.UUID
) -> Subscription | None:
    result = await session.execute(
        select(Subscription)
        .where(
            Subscription.subscriber_type == subscriber_type,
            Subscription.subscriber_id == subscriber_id,
            Subscription.state.in_(LIVE_STATES),
        )
        .order_by(
            Subscription.current_period_end.desc().nulls_last(), Subscription.created_at.desc()
        )
        .limit(1)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


async def latest_subscription(
    session: AsyncSession, *, subscriber_type: str, subscriber_id: uuid.UUID
) -> Subscription | None:
    """The live row if there is one, else the most recent tenure."""
    result = await session.execute(
        select(Subscription)
        .where(
            Subscription.subscriber_type == subscriber_type,
            Subscription.subscriber_id == subscriber_id,
        )
        .order_by(
            Subscription.state.in_(LIVE_STATES).desc(),
            Subscription.current_period_end.desc().nulls_last(),
            Subscription.created_at.desc(),
        )
        .limit(1)
    )
    return result.scalar_one_or_none()


async def lock_subscription(
    session: AsyncSession, *, subscription_id: uuid.UUID
) -> Subscription | None:
    result = await session.execute(
        select(Subscription)
        .where(Subscription.id == subscription_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


async def insert_subscription(
    session: AsyncSession,
    *,
    subscriber_type: str,
    subscriber_id: uuid.UUID,
    plan_id: uuid.UUID,
    state: str,
    current_period_start: datetime,
    current_period_end: datetime,
) -> Subscription:
    row = Subscription(
        subscriber_type=subscriber_type,
        subscriber_id=subscriber_id,
        plan_id=plan_id,
        state=state,
        current_period_start=current_period_start,
        current_period_end=current_period_end,
        renews_automatically=False,
    )
    session.add(row)
    await session.flush()
    return row


async def insert_event(
    session: AsyncSession,
    *,
    subscription_id: uuid.UUID,
    from_state: str | None,
    to_state: str,
    reason: str,
    payment_id: uuid.UUID | None,
) -> None:
    """**The only write path to `subscription_events`.**"""
    session.add(
        SubscriptionEvent(
            subscription_id=subscription_id,
            from_state=from_state,
            to_state=to_state,
            reason=reason,
            payment_id=payment_id,
        )
    )
    await session.flush()


async def list_events(
    session: AsyncSession, *, subscription_id: uuid.UUID
) -> list[SubscriptionEvent]:
    result = await session.execute(
        select(SubscriptionEvent)
        .where(SubscriptionEvent.subscription_id == subscription_id)
        .order_by(SubscriptionEvent.occurred_at, SubscriptionEvent.id)
    )
    return list(result.scalars())


async def due_subscription_ids(
    session: AsyncSession, *, ends_before: datetime, limit: int
) -> list[uuid.UUID]:
    """Live rows the renewal sweep has something to consider for: ending
    within the notice horizon, already ended, or in grace."""
    result = await session.execute(
        select(Subscription.id)
        .where(
            Subscription.state.in_(LIVE_STATES),
            or_(Subscription.current_period_end <= ends_before, Subscription.state == "GRACE"),
        )
        .order_by(Subscription.current_period_end)
        .limit(limit)
    )
    return list(result.scalars())


# --- mandates ------------------------------------------------------------------
async def open_mandate(session: AsyncSession, *, subscription_id: uuid.UUID) -> UpiMandate | None:
    result = await session.execute(
        select(UpiMandate)
        .where(
            UpiMandate.subscription_id == subscription_id,
            UpiMandate.state.in_(OPEN_MANDATE_STATES),
        )
        .order_by(UpiMandate.created_at.desc())
        .limit(1)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


async def lock_mandate_by_ref(
    session: AsyncSession, *, provider_mandate_ref: str
) -> UpiMandate | None:
    result = await session.execute(
        select(UpiMandate)
        .where(UpiMandate.provider_mandate_ref == provider_mandate_ref)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


async def lock_mandate(session: AsyncSession, *, mandate_id: uuid.UUID) -> UpiMandate | None:
    result = await session.execute(
        select(UpiMandate)
        .where(UpiMandate.id == mandate_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


async def insert_mandate(
    session: AsyncSession,
    *,
    subscription_id: uuid.UUID,
    registered_by: uuid.UUID,
    provider_mandate_ref: str,
    max_amount_minor: int,
    valid_until: datetime,
) -> UpiMandate:
    row = UpiMandate(
        subscription_id=subscription_id,
        registered_by=registered_by,
        provider_mandate_ref=provider_mandate_ref,
        state="PENDING",
        max_amount_minor=max_amount_minor,
        valid_until=valid_until,
    )
    session.add(row)
    await session.flush()
    return row


# --- pre-debit notices ---------------------------------------------------------
async def latest_notice(
    session: AsyncSession, *, mandate_id: uuid.UUID, period_end: datetime
) -> MandateDebitNotice | None:
    result = await session.execute(
        select(MandateDebitNotice)
        .where(
            MandateDebitNotice.mandate_id == mandate_id,
            MandateDebitNotice.period_end == period_end,
        )
        .order_by(MandateDebitNotice.attempt.desc())
        .limit(1)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


async def insert_notice(
    session: AsyncSession,
    *,
    mandate_id: uuid.UUID,
    subscription_id: uuid.UUID,
    period_end: datetime,
    attempt: int,
    amount_minor: int,
    provider_notice_ref: str,
    notified_at: datetime,
    debit_not_before: datetime,
) -> uuid.UUID | None:
    """None when another sweep already wrote this attempt's notice."""
    result = await session.execute(
        pg_insert(MandateDebitNotice)
        .values(
            id=uuid.uuid4(),
            mandate_id=mandate_id,
            subscription_id=subscription_id,
            period_end=period_end,
            attempt=attempt,
            amount_minor=amount_minor,
            provider_notice_ref=provider_notice_ref,
            notified_at=notified_at,
            debit_not_before=debit_not_before,
            state="NOTIFIED",
        )
        .on_conflict_do_nothing(constraint="uq_mandate_debit_notice_attempt")
        .returning(MandateDebitNotice.id)
    )
    return result.scalar_one_or_none()


async def lock_notice(session: AsyncSession, *, notice_id: uuid.UUID) -> MandateDebitNotice | None:
    result = await session.execute(
        select(MandateDebitNotice)
        .where(MandateDebitNotice.id == notice_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


async def lock_notice_by_payment(
    session: AsyncSession, *, payment_id: uuid.UUID
) -> MandateDebitNotice | None:
    result = await session.execute(
        select(MandateDebitNotice)
        .where(MandateDebitNotice.payment_id == payment_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()
