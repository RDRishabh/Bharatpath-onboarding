"""subscriptions - pure domain logic

Plans, periods, renewal, cancellation, seats.

No I/O. No database, no HTTP, no clock, no randomness that is not passed in.
mypy runs in strict mode here and import-linter forbids I/O imports, because
this is the layer the invariant property tests exercise directly.

**The state machine, in one place:**

    (none)  --purchase-->            ACTIVE
    ACTIVE  --repurchase-->          ACTIVE  (period extended from its end)
    ACTIVE  --period ends-->         CANCELLED  if the subscriber cancelled
                                     GRACE      if a mandate renewal is outstanding
                                     LAPSED     otherwise
    GRACE   --debit succeeds-->      ACTIVE  (period runs from the old end)
    GRACE   --repurchase-->          ACTIVE  (period runs from now)
    GRACE   --grace ends-->          LAPSED

LAPSED and CANCELLED are the end of a tenure, never revived: buying again
opens a new row, so each row's events tell the story of one run of payments.
Nothing here deletes anything -- a lapsed subscriber loses access, not their
history (R13).

**Access is decided by the clock, not by this machine** (`app.core.entitlements`).
A period that ended a second ago grants nothing even if no sweep has moved the
row yet. So entering GRACE has to move `current_period_end` to the end of the
grace, or GRACE would grant nothing; `grace_from` keeps the paid end.

**Grace exists only for the mandate path.** It covers the gap between a debit
failing and the payer fixing it. A manual subscriber has nothing outstanding
at the end of a period, so they lapse, and repurchasing restores them at once.
"""

from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Final, Literal

SubscriberType = Literal["USER", "TENANT"]

#: The states in which a row is the subscriber's current one.
LIVE_STATES: Final = frozenset({"ACTIVE", "GRACE"})

#: Who subscribes for each audience. A candidate subscribes as themselves; an
#: employer or college as its organisation, whoever in it pays.
SUBSCRIBER_FOR_AUDIENCE: Final[dict[str, SubscriberType]] = {
    "CANDIDATE": "USER",
    "EMPLOYER": "TENANT",
    "COLLEGE": "TENANT",
}

#: RBI's e-mandate rules require the payer be notified at least 24 hours
#: before each debit. A config row asking for less is refused.
MIN_PRE_DEBIT_NOTICE_HOURS: Final = 24


def add_months(moment: datetime, months: int) -> datetime:
    """Calendar months, day clamped: 31 January plus one month is 28 or 29
    February, never 3 March. Keeps the time of day and the zone."""
    if months < 1:
        raise ValueError("months must be at least 1")
    index = moment.month - 1 + months
    year, month = moment.year + index // 12, index % 12 + 1
    day = min(moment.day, calendar.monthrange(year, month)[1])
    return moment.replace(year=year, month=month, day=day)


# ---------------------------------------------------------------------------
# Renewal policy -- config_values `subscriptions.renewal`
# ---------------------------------------------------------------------------
@dataclass(frozen=True, slots=True)
class RenewalPolicy:
    """Every number here is ours, not the client's."""

    #: Days of access after a period ends while a mandate debit is outstanding.
    grace_days: int = 3
    #: How long before a period ends the first pre-debit notice goes out.
    notice_lead_hours: int = 72
    #: The wait between notifying the payer and debiting them.
    pre_debit_notice_hours: int = MIN_PRE_DEBIT_NOTICE_HOURS
    #: Debit attempts per renewal, each with its own notice, before falling
    #: back to manual renewal.
    max_debit_attempts: int = 3
    #: The largest amount a mandate may be registered for. Above RBI's limit
    #: for debits without additional authentication (Rs 15,000 for most
    #: categories) every renewal would need the payer to approve it in their
    #: app, which is manual renewal with extra steps. **Confirm against the
    #: gateway chosen** (blockers D3).
    mandate_max_amount_minor: int = 1_500_000
    #: How long a mandate is registered for.
    mandate_validity_days: int = 1825
    version: str = "default"


DEFAULT_POLICY: Final = RenewalPolicy()

_POLICY_BOUNDS: Final[dict[str, tuple[int, int]]] = {
    "grace_days": (0, 30),
    "notice_lead_hours": (MIN_PRE_DEBIT_NOTICE_HOURS + 1, 24 * 14),
    "pre_debit_notice_hours": (MIN_PRE_DEBIT_NOTICE_HOURS, 24 * 7),
    "max_debit_attempts": (1, 10),
    "mandate_max_amount_minor": (1, 100_000_000),
    "mandate_validity_days": (30, 3650),
}


class RenewalPolicyError(ValueError):
    """A renewal policy that cannot be applied. Never silently defaulted."""


def policy_from_config(value: dict[str, Any], *, version: str) -> RenewalPolicy:
    """Every key is optional and falls back to the default; an unknown key, a
    non-integer or an out-of-range value is refused."""
    unknown = set(value) - set(_POLICY_BOUNDS)
    if unknown:
        raise RenewalPolicyError(f"unknown renewal policy keys: {sorted(unknown)}")
    fields: dict[str, int] = {}
    for key, (low, high) in _POLICY_BOUNDS.items():
        if key not in value:
            continue
        number = value[key]
        if not isinstance(number, int) or isinstance(number, bool) or not low <= number <= high:
            raise RenewalPolicyError(f"{key} must be an integer between {low} and {high}")
        fields[key] = number
    policy = RenewalPolicy(**fields, version=version)
    if policy.notice_lead_hours <= policy.pre_debit_notice_hours:
        raise RenewalPolicyError("notice_lead_hours must exceed pre_debit_notice_hours")
    return policy


# ---------------------------------------------------------------------------
# Periods
# ---------------------------------------------------------------------------
@dataclass(frozen=True, slots=True)
class PeriodView:
    state: str
    start: datetime | None
    end: datetime | None
    grace_from: datetime | None = None


@dataclass(frozen=True, slots=True)
class PeriodChange:
    from_state: str | None
    start: datetime
    end: datetime
    reason: str


def paid_period(
    current: PeriodView | None, *, months: int, now: datetime, by_mandate: bool = False
) -> PeriodChange:
    """The period a verified payment buys. The result is always ACTIVE.

    * **Nothing live** -> from now.
    * **Active and not yet ended** -> extended from its end, so renewing early
      never costs the days already paid for.
    * **A mandate debit in grace** -> from the paid end, so the grace days
      fall inside the renewed period rather than being given away. If even
      that period is already over, from now.
    * **Anything else** (a repurchase in grace, or an active row whose end has
      passed before the sweep saw it) -> from now.
    """
    if (
        current is not None
        and current.state == "ACTIVE"
        and current.start is not None
        and current.end is not None
        and current.end > now
    ):
        return PeriodChange(
            "ACTIVE",
            current.start,
            add_months(current.end, months),
            "renewed_by_mandate" if by_mandate else "extended",
        )
    if by_mandate and current is not None and current.state == "GRACE" and current.grace_from:
        end = add_months(current.grace_from, months)
        if end > now:
            return PeriodChange("GRACE", current.grace_from, end, "renewed_by_mandate")
    if current is None:
        return PeriodChange(None, now, add_months(now, months), "purchased")
    return PeriodChange(
        current.state,
        now,
        add_months(now, months),
        "renewed_by_mandate" if by_mandate else "renewed",
    )


@dataclass(frozen=True, slots=True)
class PeriodEnd:
    to_state: str
    end: datetime
    grace_from: datetime | None
    reason: str


def period_end_step(
    current: PeriodView,
    *,
    cancel_at: datetime | None,
    renews: bool,
    mandate_active: bool,
    now: datetime,
    policy: RenewalPolicy,
) -> PeriodEnd | None:
    """What happens to a live row whose period has ended. None if it has not."""
    if current.end is None or current.end > now:
        return None
    if current.state == "ACTIVE":
        if cancel_at is not None:
            return PeriodEnd("CANCELLED", current.end, None, "cancelled")
        if renews and mandate_active:
            return PeriodEnd(
                "GRACE",
                current.end + timedelta(days=policy.grace_days),
                current.end,
                "grace_started",
            )
        return PeriodEnd("LAPSED", current.end, None, "lapsed")
    if current.state == "GRACE":
        if cancel_at is not None:
            return PeriodEnd("CANCELLED", current.end, current.grace_from, "cancelled")
        return PeriodEnd("LAPSED", current.end, current.grace_from, "grace_ended")
    return None


# ---------------------------------------------------------------------------
# The mandate renewal cycle
# ---------------------------------------------------------------------------
@dataclass(frozen=True, slots=True)
class NoticeView:
    """The latest pre-debit notice for the period being renewed."""

    attempt: int
    state: str
    debit_not_before: datetime


RenewalKind = Literal["NONE", "SEND_NOTICE", "REQUEST_DEBIT", "FALL_BACK"]


@dataclass(frozen=True, slots=True)
class RenewalAction:
    kind: RenewalKind
    attempt: int = 0
    reason: str = ""


NO_ACTION: Final = RenewalAction("NONE")


def renewal_anchor(current: PeriodView) -> datetime | None:
    """The paid end a renewal continues from."""
    if current.state == "GRACE" and current.grace_from is not None:
        return current.grace_from
    return current.end


def renewal_action(
    current: PeriodView,
    *,
    renews: bool,
    cancel_at: datetime | None,
    mandate_state: str | None,
    mandate_ceiling_minor: int | None,
    price_minor: int,
    latest_notice: NoticeView | None,
    policy: RenewalPolicy,
    now: datetime,
) -> RenewalAction:
    """The next step in renewing one subscription by mandate. Idempotent: run
    it twice at the same instant against the same rows and it asks for the
    same thing, which the unique key on notices then refuses to do twice.

    Every debit attempt is preceded by its own notice, and waits the full
    notice period after it. **Nothing debits a payer who was not told.**
    """
    anchor = renewal_anchor(current)
    if (
        current.state not in LIVE_STATES
        or anchor is None
        or not renews
        or cancel_at is not None
        or mandate_state != "ACTIVE"
        or mandate_ceiling_minor is None
    ):
        return NO_ACTION
    if price_minor > mandate_ceiling_minor or price_minor > policy.mandate_max_amount_minor:
        # The ceiling is fixed at registration. A price rise past it cannot be
        # debited, so the subscriber renews by hand -- and is told now, while
        # the period still has days in it, rather than when access stops.
        return RenewalAction("FALL_BACK", reason="mandate_ceiling_exceeded")
    if current.state == "ACTIVE" and anchor - now > timedelta(hours=policy.notice_lead_hours):
        return NO_ACTION
    if latest_notice is None:
        return RenewalAction("SEND_NOTICE", attempt=1)
    if latest_notice.state == "NOTIFIED":
        if now >= latest_notice.debit_not_before:
            return RenewalAction("REQUEST_DEBIT", attempt=latest_notice.attempt)
        return NO_ACTION
    if latest_notice.state == "FAILED":
        if latest_notice.attempt < policy.max_debit_attempts:
            return RenewalAction("SEND_NOTICE", attempt=latest_notice.attempt + 1)
        return RenewalAction("FALL_BACK", reason="debit_attempts_exhausted")
    return NO_ACTION
