"""subscriptions - business rules and transaction boundaries

Plans, periods, renewal, cancellation, seats.

Services own the transaction. They never touch `Request`, and anything that
reveals private data writes its audit row on the same session before the
transaction closes.

**This module never talks to a gateway and never grants a period on its own
say-so.** Every period comes from `billing.service` after a verified callback
(`apply_purchase`, `apply_mandate_renewal`). Where a gateway has to be told
something -- a mandate revoked on cancellation or on falling back to manual --
the functions here change our rows and return the references, and billing
makes the call inside the same transaction.

**Every change writes a `subscription_events` row and an outbox event**
(`_record`), including changes that keep the state: an extension, a
cancellation requested, auto-renew switched on or off.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Final

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import (
    CANDIDATE,
    COLLEGE_ADMIN,
    COLLEGE_STAFF,
    EMPLOYER_OWNER,
    EMPLOYER_RECRUITER,
    EMPLOYER_VIEWER,
)
from app.core.entitlements import has_active_subscription
from app.core.errors import AppError, ConflictError, NotFoundError, PermissionDeniedError
from app.core.errors import ValidationError as AppValidationError
from app.core.logging import get_logger
from app.core.outbox import emit
from app.core.tenant import TenantContext
from app.modules.subscriptions import repository
from app.modules.subscriptions.catalogue import PERIOD_MONTHS, PLANS
from app.modules.subscriptions.domain import (
    DEFAULT_POLICY,
    LIVE_STATES,
    NoticeView,
    PeriodView,
    RenewalAction,
    RenewalPolicy,
    RenewalPolicyError,
    SubscriberType,
    paid_period,
    period_end_step,
    policy_from_config,
    renewal_action,
    renewal_anchor,
)
from app.modules.subscriptions.events import FELL_BACK_TO_MANUAL, PRE_DEBIT_NOTIFIED, STATE_CHANGED
from app.modules.subscriptions.models import Plan, Subscription, UpiMandate

logger = get_logger(__name__)

#: The `config_values` key holding `RenewalPolicy`.
RENEWAL_CONFIG_KEY: Final = "subscriptions.renewal"

EMPLOYER_ROLES: Final = frozenset({EMPLOYER_OWNER, EMPLOYER_RECRUITER, EMPLOYER_VIEWER})
COLLEGE_ROLES: Final = frozenset({COLLEGE_ADMIN, COLLEGE_STAFF})
#: Who spends an organisation's money: its owner, or a college's admin.
BUYER_ROLES: Final = frozenset({EMPLOYER_OWNER, COLLEGE_ADMIN})

#: Most rows one renewal sweep considers. The next run takes the rest.
SWEEP_BATCH: Final = 500


class PlanNotFoundError(NotFoundError):
    code = "plan_not_found"
    title = "Plan not found"


class SubscriptionNotActiveError(ConflictError):
    code = "subscription_not_active"
    title = "There is no active subscription"


class SubscriptionCancellingError(ConflictError):
    code = "subscription_cancelling"
    title = "The subscription is set to end"


class MandateExistsError(ConflictError):
    code = "mandate_exists"
    title = "Auto-renew is already set up"


class MandateAmountOverLimitError(AppValidationError):
    """The plan costs more than a mandate may debit without the payer
    approving each debit, which would make auto-renew manual in disguise."""

    code = "mandate_amount_over_limit"
    title = "This plan cannot renew automatically"


class RenewalPolicyInvalidError(AppError):
    """A 500, deliberately: a broken policy row must not look applied."""

    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    code = "renewal_policy_invalid"
    title = "Renewal policy is misconfigured"


@dataclass(frozen=True, slots=True)
class Subscriber:
    type: SubscriberType
    id: uuid.UUID
    audience: str


def subscriber_for(ctx: TenantContext) -> Subscriber:
    """Who a caller subscribes as. A candidate as themselves; employer staff
    and college staff as their organisation, from the resolved membership and
    never a request."""
    if ctx.tenant_id is None:
        if ctx.role != CANDIDATE:
            raise PermissionDeniedError()
        return Subscriber("USER", ctx.user_id, "CANDIDATE")
    if ctx.role in EMPLOYER_ROLES:
        return Subscriber("TENANT", ctx.tenant_id, "EMPLOYER")
    if ctx.role in COLLEGE_ROLES:
        return Subscriber("TENANT", ctx.tenant_id, "COLLEGE")
    raise PermissionDeniedError()


async def load_policy(session: AsyncSession, *, now: datetime) -> RenewalPolicy:
    """The policy in force at `now`: the latest config row, else the default."""
    row = await repository.current_config(session, key=RENEWAL_CONFIG_KEY, now=now)
    if row is None:
        return DEFAULT_POLICY
    try:
        if not isinstance(row.value, dict):
            raise RenewalPolicyError("renewal policy must be a JSON object")
        return policy_from_config(row.value, version=f"config-v{row.version}")
    except RenewalPolicyError as exc:
        logger.error("renewal_policy_invalid", config_version=row.version, error=str(exc))
        raise RenewalPolicyInvalidError() from exc


def _view(row: Subscription) -> PeriodView:
    return PeriodView(row.state, row.current_period_start, row.current_period_end, row.grace_from)


async def _record(
    session: AsyncSession,
    row: Subscription,
    *,
    from_state: str | None,
    reason: str,
    payment_id: uuid.UUID | None = None,
) -> None:
    await repository.insert_event(
        session,
        subscription_id=row.id,
        from_state=from_state,
        to_state=row.state,
        reason=reason,
        payment_id=payment_id,
    )
    await emit(
        session,
        event_type=STATE_CHANGED,
        aggregate_type="subscription",
        aggregate_id=row.id,
        payload={
            "subscription_id": str(row.id),
            "subscriber_type": row.subscriber_type,
            "subscriber_id": str(row.subscriber_id),
            "from_state": from_state,
            "to_state": row.state,
            "reason": reason,
        },
    )
    logger.info("subscription_changed", from_state=from_state, to_state=row.state, reason=reason)


# ---------------------------------------------------------------------------
# Plans
# ---------------------------------------------------------------------------
async def list_plans(session: AsyncSession, *, audience: str) -> list[Plan]:
    return await repository.list_active_plans(session, audience=audience)


async def purchasable_plan(session: AsyncSession, *, code: str, audience: str) -> Plan:
    """An active plan for this audience. Another audience's plan is a 404: a
    candidate cannot buy the employer database by naming its code."""
    plan = await repository.active_plan_by_code(session, code=code, audience=audience)
    if plan is None:
        raise PlanNotFoundError()
    return plan


async def get_plan(session: AsyncSession, *, plan_id: uuid.UUID) -> Plan:
    plan = await repository.get_plan(session, plan_id=plan_id)
    if plan is None:
        raise PlanNotFoundError()
    return plan


async def sync_plans(session: AsyncSession) -> int:
    """Write `catalogue.PLANS` into `plans`. Returns the rows written.

    Unchanged plans are left alone. **A changed plan gets a new version and the
    old one is deactivated, never edited**, so a payment already pointing at it
    still says what it bought. Idempotent.
    """
    written = 0
    for entry in PLANS:
        latest = await repository.latest_plan_version(session, code=entry.code)
        if latest is not None and (
            latest.audience,
            latest.period,
            latest.price_minor,
            latest.seat_allowance,
            latest.active,
        ) == (entry.audience, entry.period, entry.price_minor, entry.seat_allowance, entry.active):
            continue
        if latest is not None:
            latest.active = False
        await repository.insert_plan(
            session,
            code=entry.code,
            audience=entry.audience,
            period=entry.period,
            price_minor=entry.price_minor,
            seat_allowance=entry.seat_allowance,
            active=entry.active,
            version=latest.version + 1 if latest is not None else 1,
        )
        written += 1
    return written


# ---------------------------------------------------------------------------
# Reading
# ---------------------------------------------------------------------------
@dataclass(frozen=True, slots=True)
class SubscriptionStatus:
    subscription: Subscription | None
    plan: Plan | None
    mandate: UpiMandate | None
    #: The same answer `require_active_subscription` gives, from the same query.
    has_access: bool


async def status_for(session: AsyncSession, *, subscriber: Subscriber) -> SubscriptionStatus:
    row = await repository.latest_subscription(
        session, subscriber_type=subscriber.type, subscriber_id=subscriber.id
    )
    plan = await repository.get_plan(session, plan_id=row.plan_id) if row else None
    mandate = await repository.open_mandate(session, subscription_id=row.id) if row else None
    has_access = await has_active_subscription(
        session, subscriber_type=subscriber.type, subscriber_id=subscriber.id
    )
    return SubscriptionStatus(row, plan, mandate, has_access)


# ---------------------------------------------------------------------------
# Periods bought -- called by billing, after a verified callback only
# ---------------------------------------------------------------------------
async def apply_purchase(
    session: AsyncSession,
    *,
    subscriber_type: str,
    subscriber_id: uuid.UUID,
    plan_id: uuid.UUID,
    payment_id: uuid.UUID,
    now: datetime,
) -> Subscription:
    """A verified payment for a plan: open a tenure, or extend the live one.

    Buying again clears a pending cancellation -- paying for another period
    is the clearest statement that the subscriber wants one.
    """
    plan = await get_plan(session, plan_id=plan_id)
    await repository.lock_subscriber(
        session, subscriber_type=subscriber_type, subscriber_id=subscriber_id
    )
    row = await repository.live_subscription_for_update(
        session, subscriber_type=subscriber_type, subscriber_id=subscriber_id
    )
    change = paid_period(_view(row) if row else None, months=PERIOD_MONTHS[plan.period], now=now)
    if row is None:
        row = await repository.insert_subscription(
            session,
            subscriber_type=subscriber_type,
            subscriber_id=subscriber_id,
            plan_id=plan.id,
            state="ACTIVE",
            current_period_start=change.start,
            current_period_end=change.end,
        )
    else:
        row.state = "ACTIVE"
        row.plan_id = plan.id
        row.current_period_start = change.start
        row.current_period_end = change.end
        row.grace_from = None
        row.cancel_at = None
        await session.flush()
    await _record(
        session, row, from_state=change.from_state, reason=change.reason, payment_id=payment_id
    )
    return row


async def apply_mandate_renewal(
    session: AsyncSession,
    *,
    subscription_id: uuid.UUID,
    plan_id: uuid.UUID,
    payment_id: uuid.UUID,
    now: datetime,
) -> Subscription:
    """A verified mandate debit: renew the subscription it was requested for.

    The one path that can bring a LAPSED row back: a debit requested in grace
    and settled after the grace ran out has still been paid for, and the payer
    gets the period rather than a refund conversation.
    """
    row = await repository.lock_subscription(session, subscription_id=subscription_id)
    if row is None:  # pragma: no cover - the payment's foreign key holds it
        raise SubscriptionNotActiveError()
    plan = await get_plan(session, plan_id=plan_id)
    change = paid_period(_view(row), months=PERIOD_MONTHS[plan.period], now=now, by_mandate=True)
    row.state = "ACTIVE"
    row.plan_id = plan.id
    row.current_period_start = change.start
    row.current_period_end = change.end
    row.grace_from = None
    notice = await repository.lock_notice_by_payment(session, payment_id=payment_id)
    if notice is not None:
        notice.state = "SUCCEEDED"
    await session.flush()
    await _record(
        session, row, from_state=change.from_state, reason=change.reason, payment_id=payment_id
    )
    return row


# ---------------------------------------------------------------------------
# Cancellation and mandates
# ---------------------------------------------------------------------------
async def cancel_at_period_end(
    session: AsyncSession, *, subscriber: Subscriber, now: datetime
) -> list[str]:
    """Stop renewing. Access continues to the end of what was paid for.

    Returns the gateway references of mandates revoked here, for billing to
    revoke at the gateway in the same transaction. Idempotent: cancelling
    twice changes nothing and revokes nothing twice.

    No refund and no immediate end: the refund policy is the client's.
    """
    await repository.lock_subscriber(
        session, subscriber_type=subscriber.type, subscriber_id=subscriber.id
    )
    row = await repository.live_subscription_for_update(
        session, subscriber_type=subscriber.type, subscriber_id=subscriber.id
    )
    if row is None:
        raise SubscriptionNotActiveError()
    if row.cancel_at is not None:
        return []
    row.cancel_at = row.current_period_end
    row.renews_automatically = False
    refs: list[str] = []
    mandate = await repository.open_mandate(session, subscription_id=row.id)
    if mandate is not None:
        mandate.state = "REVOKED"
        mandate.revoked_at = now
        refs.append(mandate.provider_mandate_ref)
    await session.flush()
    await _record(session, row, from_state=row.state, reason="cancel_requested")
    return refs


@dataclass(frozen=True, slots=True)
class MandateTarget:
    subscription_id: uuid.UUID
    ceiling_minor: int


async def mandate_target(
    session: AsyncSession, *, subscriber: Subscriber, policy: RenewalPolicy, now: datetime
) -> MandateTarget:
    """What a new mandate would be registered against, or why it cannot be.

    **The ceiling is the plan's price today.** It is fixed at registration, so
    a later price rise past it falls the subscriber back to manual renewal
    (`renewal_action`) rather than debiting more than they authorised.
    """
    row = await repository.live_subscription_for_update(
        session, subscriber_type=subscriber.type, subscriber_id=subscriber.id
    )
    if row is None or row.current_period_end is None or row.current_period_end <= now:
        raise SubscriptionNotActiveError()
    if row.cancel_at is not None:
        raise SubscriptionCancellingError()
    if await repository.open_mandate(session, subscription_id=row.id) is not None:
        raise MandateExistsError()
    plan = await get_plan(session, plan_id=row.plan_id)
    if plan.price_minor > policy.mandate_max_amount_minor:
        raise MandateAmountOverLimitError(params={"limit_minor": policy.mandate_max_amount_minor})
    return MandateTarget(row.id, plan.price_minor)


async def record_mandate(
    session: AsyncSession,
    *,
    subscription_id: uuid.UUID,
    registered_by: uuid.UUID,
    provider_mandate_ref: str,
    max_amount_minor: int,
    valid_until: datetime,
) -> UpiMandate:
    """PENDING until the gateway reports the payer authorised it. Auto-renew
    is not on until then."""
    return await repository.insert_mandate(
        session,
        subscription_id=subscription_id,
        registered_by=registered_by,
        provider_mandate_ref=provider_mandate_ref,
        max_amount_minor=max_amount_minor,
        valid_until=valid_until,
    )


async def activate_mandate(
    session: AsyncSession, *, provider_mandate_ref: str, now: datetime
) -> str:
    """The payer authorised the mandate. Returns a callback outcome."""
    mandate = await repository.lock_mandate_by_ref(
        session, provider_mandate_ref=provider_mandate_ref
    )
    if mandate is None:
        return "UNMATCHED"
    if mandate.state == "ACTIVE":
        return "DUPLICATE"
    if mandate.state != "PENDING":
        # Revoked -- by a cancellation, say -- before the authorisation landed.
        return "REFUSED"
    mandate.state = "ACTIVE"
    mandate.activated_at = now
    row = await repository.lock_subscription(session, subscription_id=mandate.subscription_id)
    await session.flush()
    if row is not None and row.state in LIVE_STATES and row.cancel_at is None:
        row.renews_automatically = True
        await session.flush()
        await _record(session, row, from_state=row.state, reason="auto_renew_enabled")
    return "APPLIED"


async def _lose_mandate(
    session: AsyncSession,
    mandate: UpiMandate,
    *,
    state: str,
    reason: str,
    now: datetime,
    failure_code: str | None = None,
) -> None:
    """End a mandate and, if it was renewing a subscription, fall back to manual
    renewal and tell the subscriber while the period still has days in it."""
    mandate.state = state
    mandate.revoked_at = now
    if failure_code is not None:
        mandate.last_failure_code = failure_code
    row = await repository.lock_subscription(session, subscription_id=mandate.subscription_id)
    await session.flush()
    if row is None or not row.renews_automatically:
        return
    row.renews_automatically = False
    await session.flush()
    await _record(session, row, from_state=row.state, reason=reason)
    await emit(
        session,
        event_type=FELL_BACK_TO_MANUAL,
        aggregate_type="subscription",
        aggregate_id=row.id,
        payload={
            "subscription_id": str(row.id),
            "subscriber_type": row.subscriber_type,
            "subscriber_id": str(row.subscriber_id),
            "reason": reason,
            "access_until": row.current_period_end.isoformat() if row.current_period_end else None,
        },
    )


async def mandate_revoked_by_payer(
    session: AsyncSession, *, provider_mandate_ref: str, now: datetime
) -> str:
    """The gateway told us the payer revoked it. Often it will not (see
    `REVOKED_UNKNOWN`); this is the case where it does."""
    mandate = await repository.lock_mandate_by_ref(
        session, provider_mandate_ref=provider_mandate_ref
    )
    if mandate is None:
        return "UNMATCHED"
    if mandate.state not in repository.OPEN_MANDATE_STATES:
        return "DUPLICATE"
    await _lose_mandate(session, mandate, state="REVOKED", reason="mandate_revoked", now=now)
    return "APPLIED"


async def fall_back_to_manual(
    session: AsyncSession, *, subscription_id: uuid.UUID, reason: str, now: datetime
) -> list[str]:
    """Stop renewing by mandate. Returns the references to revoke at the gateway."""
    mandate = await repository.open_mandate(session, subscription_id=subscription_id)
    if mandate is None:
        return []
    ref = mandate.provider_mandate_ref
    await _lose_mandate(session, mandate, state="REVOKED", reason=reason, now=now)
    return [ref]


async def record_debit_failure(
    session: AsyncSession,
    *,
    payment_id: uuid.UUID,
    failure_code: str,
    mandate_gone: bool,
    now: datetime,
) -> None:
    """A mandate debit failed. **If the mandate itself is gone -- revoked in the
    payer's UPI app, where we are never told -- this is how we find out**, and
    it becomes REVOKED_UNKNOWN rather than being retried until access lapses.
    Any other failure leaves the next attempt to the renewal sweep."""
    notice = await repository.lock_notice_by_payment(session, payment_id=payment_id)
    if notice is None:
        return
    notice.state = "FAILED"
    mandate = await repository.lock_mandate(session, mandate_id=notice.mandate_id)
    await session.flush()
    if mandate is None:  # pragma: no cover - the notice's foreign key holds it
        return
    if mandate_gone and mandate.state == "ACTIVE":
        await _lose_mandate(
            session,
            mandate,
            state="REVOKED_UNKNOWN",
            reason="mandate_lost",
            now=now,
            failure_code=failure_code,
        )
        return
    mandate.last_failure_code = failure_code
    await session.flush()


# ---------------------------------------------------------------------------
# The renewal sweep
# ---------------------------------------------------------------------------
async def due_subscription_ids(session: AsyncSession, *, now: datetime) -> list[uuid.UUID]:
    policy = await load_policy(session, now=now)
    return await repository.due_subscription_ids(
        session, ends_before=now + timedelta(hours=policy.notice_lead_hours), limit=SWEEP_BATCH
    )


@dataclass(frozen=True, slots=True)
class RenewalStep:
    """The next renewal step for one subscription, with what billing needs to
    take it. The subscription row is locked for the rest of the transaction."""

    action: RenewalAction
    subscription_id: uuid.UUID
    subscriber_type: str
    subscriber_id: uuid.UUID
    plan_id: uuid.UUID
    plan_code: str
    price_minor: int
    anchor: datetime | None
    mandate_id: uuid.UUID | None
    mandate_ref: str | None
    registered_by: uuid.UUID | None
    notice_id: uuid.UUID | None
    #: What the latest notice told the payer. A debit takes this, never a
    #: price changed since the notice went out.
    notice_amount_minor: int | None
    policy: RenewalPolicy


async def next_renewal_step(
    session: AsyncSession, *, subscription_id: uuid.UUID, now: datetime
) -> RenewalStep | None:
    row = await repository.lock_subscription(session, subscription_id=subscription_id)
    if row is None:
        return None
    policy = await load_policy(session, now=now)
    plan = await get_plan(session, plan_id=row.plan_id)
    mandate = await repository.open_mandate(session, subscription_id=row.id)
    view = _view(row)
    anchor = renewal_anchor(view)
    notice = (
        await repository.latest_notice(session, mandate_id=mandate.id, period_end=anchor)
        if mandate is not None and anchor is not None
        else None
    )
    action = renewal_action(
        view,
        renews=row.renews_automatically,
        cancel_at=row.cancel_at,
        mandate_state=mandate.state if mandate else None,
        mandate_ceiling_minor=mandate.max_amount_minor if mandate else None,
        price_minor=plan.price_minor,
        latest_notice=(
            NoticeView(notice.attempt, notice.state, notice.debit_not_before) if notice else None
        ),
        policy=policy,
        now=now,
    )
    return RenewalStep(
        action=action,
        subscription_id=row.id,
        subscriber_type=row.subscriber_type,
        subscriber_id=row.subscriber_id,
        plan_id=plan.id,
        plan_code=plan.code,
        price_minor=plan.price_minor,
        anchor=anchor,
        mandate_id=mandate.id if mandate else None,
        mandate_ref=mandate.provider_mandate_ref if mandate else None,
        registered_by=mandate.registered_by if mandate else None,
        notice_id=notice.id if notice else None,
        notice_amount_minor=notice.amount_minor if notice else None,
        policy=policy,
    )


async def record_notice(
    session: AsyncSession,
    *,
    step: RenewalStep,
    provider_notice_ref: str,
    now: datetime,
    debit_not_before: datetime,
) -> bool:
    """False if another sweep already notified for this attempt."""
    if step.mandate_id is None or step.anchor is None:  # pragma: no cover - action implies both
        return False
    notice_id = await repository.insert_notice(
        session,
        mandate_id=step.mandate_id,
        subscription_id=step.subscription_id,
        period_end=step.anchor,
        attempt=step.action.attempt,
        amount_minor=step.price_minor,
        provider_notice_ref=provider_notice_ref,
        notified_at=now,
        debit_not_before=debit_not_before,
    )
    if notice_id is None:
        return False
    await emit(
        session,
        event_type=PRE_DEBIT_NOTIFIED,
        aggregate_type="subscription",
        aggregate_id=step.subscription_id,
        payload={
            "subscription_id": str(step.subscription_id),
            "subscriber_type": step.subscriber_type,
            "subscriber_id": str(step.subscriber_id),
            "amount_minor": step.price_minor,
            "debit_not_before": debit_not_before.isoformat(),
            "attempt": step.action.attempt,
        },
    )
    return True


async def mark_debit_requested(
    session: AsyncSession, *, notice_id: uuid.UUID, payment_id: uuid.UUID
) -> None:
    notice = await repository.lock_notice(session, notice_id=notice_id)
    if notice is None:  # pragma: no cover - read under lock a moment earlier
        return
    notice.state = "DEBIT_REQUESTED"
    notice.payment_id = payment_id
    await session.flush()


@dataclass(frozen=True, slots=True)
class ClosedPeriod:
    to_state: str
    revoke_refs: list[str]


async def close_period(
    session: AsyncSession, *, subscription_id: uuid.UUID, now: datetime
) -> ClosedPeriod | None:
    """Move a live row whose period has ended: to GRACE, LAPSED or CANCELLED.

    Access already stopped at the end of the period (the clock decides); this
    records it, frees the row to be superseded by a new tenure, and tells the
    subscriber. **Deletes nothing.**
    """
    row = await repository.lock_subscription(session, subscription_id=subscription_id)
    if row is None or row.state not in LIVE_STATES:
        return None
    policy = await load_policy(session, now=now)
    mandate = await repository.open_mandate(session, subscription_id=row.id)
    step = period_end_step(
        _view(row),
        cancel_at=row.cancel_at,
        renews=row.renews_automatically,
        mandate_active=mandate is not None and mandate.state == "ACTIVE",
        now=now,
        policy=policy,
    )
    if step is None:
        return None
    from_state = row.state
    row.state = step.to_state
    row.current_period_end = step.end
    row.grace_from = step.grace_from
    refs: list[str] = []
    if step.to_state != "GRACE":
        row.renews_automatically = False
        if mandate is not None:
            mandate.state = "REVOKED"
            mandate.revoked_at = now
            refs.append(mandate.provider_mandate_ref)
    await session.flush()
    await _record(session, row, from_state=from_state, reason=step.reason)
    return ClosedPeriod(step.to_state, refs)
