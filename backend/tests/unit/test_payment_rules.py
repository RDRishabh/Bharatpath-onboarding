"""The payment and subscription rules, without a database.

What is pinned here is what decides money and access: which callbacks count,
which status changes a payment may make, what period a payment buys, when a
period ends into grace or lapse, and when a payer may be debited.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from app.modules.billing.domain import (
    MANDATE_ACTIVATED,
    PAYMENT_FAILED,
    PAYMENT_SUCCEEDED,
    PAYMENT_TRANSITIONS,
    CallbackMalformedError,
    parse_callback,
    payment_step,
    sign,
    signature_matches,
)
from app.modules.subscriptions.domain import (
    DEFAULT_POLICY,
    MIN_PRE_DEBIT_NOTICE_HOURS,
    NoticeView,
    PeriodView,
    RenewalPolicyError,
    add_months,
    paid_period,
    period_end_step,
    policy_from_config,
    renewal_action,
)

SECRET = b"a-shared-gateway-secret"
NOW = datetime(2026, 9, 15, 10, 0, tzinfo=UTC)


# --- signatures ------------------------------------------------------------------
def test_a_signature_verifies_only_the_exact_body_with_the_right_key() -> None:
    body = b'{"event":"payment.succeeded"}'
    header = sign(SECRET, body)
    assert signature_matches(SECRET, body, header)
    assert signature_matches(SECRET, body, f"  {header} ")
    assert not signature_matches(SECRET, body + b" ", header)
    assert not signature_matches(b"another-key", body, header)
    assert not signature_matches(SECRET, body, header.removeprefix("sha256="))


@pytest.mark.parametrize("header", [None, "", "sha256=", "sha256=zz", "sha256=é"])
def test_a_missing_or_garbled_signature_verifies_nothing(header: str | None) -> None:
    assert not signature_matches(SECRET, b"{}", header)


def test_an_empty_secret_verifies_nothing_even_when_signed_with_it() -> None:
    assert not signature_matches(b"", b"{}", sign(b"", b"{}"))


# --- callback shape ----------------------------------------------------------------
def _payment_body(**payment: object) -> dict[str, object]:
    return {
        "event_id": "evt_1",
        "event": PAYMENT_SUCCEEDED,
        "payment": {"provider_ref": "ord_1", "amount_minor": 14900, "currency": "INR", **payment},
    }


def test_a_payment_callback_is_read_strictly() -> None:
    event = parse_callback(_payment_body())
    assert (event.provider_ref, event.amount_minor, event.currency) == ("ord_1", 14900, "INR")
    failed = parse_callback(
        {**_payment_body(failure_code="INSUFFICIENT_FUNDS"), "event": PAYMENT_FAILED}
    )
    assert failed.failure_code == "INSUFFICIENT_FUNDS"
    mandate = parse_callback(
        {"event_id": "e", "event": MANDATE_ACTIVATED, "mandate": {"provider_mandate_ref": "m"}}
    )
    assert mandate.mandate_ref == "m"


@pytest.mark.parametrize(
    "payload",
    [
        [],
        {"event": PAYMENT_SUCCEEDED},
        {**_payment_body(), "event_id": ""},
        {**_payment_body(), "event": "payment.maybe"},
        {"event_id": "e", "event": PAYMENT_SUCCEEDED},
        _payment_body(amount_minor=True),
        _payment_body(amount_minor=-1),
        _payment_body(amount_minor="14900"),
        _payment_body(provider_ref=""),
        _payment_body(currency="RUPEES"),
        {"event_id": "e", "event": MANDATE_ACTIVATED, "mandate": {}},
    ],
)
def test_a_callback_we_cannot_read_is_refused_rather_than_guessed(payload: object) -> None:
    with pytest.raises(CallbackMalformedError):
        parse_callback(payload)


# --- payment status ----------------------------------------------------------------
@pytest.mark.parametrize(
    ("status", "event", "step"),
    [
        ("PENDING", PAYMENT_SUCCEEDED, "APPLY"),
        ("PENDING", PAYMENT_FAILED, "APPLY"),
        ("FAILED", PAYMENT_SUCCEEDED, "APPLY"),
        ("SUCCEEDED", PAYMENT_SUCCEEDED, "DUPLICATE"),
        ("FAILED", PAYMENT_FAILED, "DUPLICATE"),
        ("SUCCEEDED", PAYMENT_FAILED, "REFUSE"),
        ("REFUNDED", PAYMENT_SUCCEEDED, "REFUSE"),
        ("REFUNDED", PAYMENT_FAILED, "REFUSE"),
    ],
)
def test_what_a_callback_does_to_a_payment(status: str, event: str, step: str) -> None:
    assert payment_step(status, event) == step


def test_no_transition_leaves_a_success_except_a_refund() -> None:
    assert {to for frm, to in PAYMENT_TRANSITIONS if frm == "SUCCEEDED"} == {"REFUNDED"}
    assert not [pair for pair in PAYMENT_TRANSITIONS if pair[1] == "PENDING"]


# --- periods -----------------------------------------------------------------------
@pytest.mark.parametrize(
    ("start", "months", "expected"),
    [
        (datetime(2027, 1, 31, tzinfo=UTC), 1, datetime(2027, 2, 28, tzinfo=UTC)),
        (datetime(2028, 1, 31, tzinfo=UTC), 1, datetime(2028, 2, 29, tzinfo=UTC)),
        (datetime(2026, 12, 15, 9, 30, tzinfo=UTC), 1, datetime(2027, 1, 15, 9, 30, tzinfo=UTC)),
        (datetime(2026, 8, 31, tzinfo=UTC), 6, datetime(2027, 2, 28, tzinfo=UTC)),
        (datetime(2026, 9, 15, tzinfo=UTC), 12, datetime(2027, 9, 15, tzinfo=UTC)),
    ],
)
def test_months_are_calendar_months_with_the_day_clamped(
    start: datetime, months: int, expected: datetime
) -> None:
    assert add_months(start, months) == expected


def test_a_period_of_no_months_is_refused() -> None:
    with pytest.raises(ValueError):
        add_months(NOW, 0)


def test_a_first_purchase_starts_now() -> None:
    change = paid_period(None, months=1, now=NOW)
    assert (change.from_state, change.start, change.end, change.reason) == (
        None,
        NOW,
        add_months(NOW, 1),
        "purchased",
    )


def test_renewing_early_never_costs_the_days_already_paid_for() -> None:
    start, end = NOW - timedelta(days=20), NOW + timedelta(days=10)
    change = paid_period(PeriodView("ACTIVE", start, end), months=3, now=NOW)
    assert (change.start, change.end, change.reason) == (start, add_months(end, 3), "extended")


def test_renewing_after_the_end_starts_from_now() -> None:
    ended = PeriodView("ACTIVE", NOW - timedelta(days=40), NOW - timedelta(days=10))
    assert paid_period(ended, months=1, now=NOW).start == NOW
    grace = PeriodView(
        "GRACE", NOW - timedelta(days=31), NOW + timedelta(days=2), NOW - timedelta(days=1)
    )
    manual = paid_period(grace, months=1, now=NOW)
    assert (manual.start, manual.reason) == (NOW, "renewed")


def test_a_mandate_debit_in_grace_renews_from_the_paid_end() -> None:
    paid_end = NOW - timedelta(days=1)
    grace = PeriodView("GRACE", paid_end - timedelta(days=30), NOW + timedelta(days=2), paid_end)
    change = paid_period(grace, months=1, now=NOW, by_mandate=True)
    assert (change.start, change.end, change.reason) == (
        paid_end,
        add_months(paid_end, 1),
        "renewed_by_mandate",
    )


def test_a_mandate_debit_settling_after_its_whole_period_starts_from_now() -> None:
    paid_end = NOW - timedelta(days=60)
    lapsed = PeriodView(
        "GRACE", paid_end - timedelta(days=30), paid_end + timedelta(days=3), paid_end
    )
    assert paid_period(lapsed, months=1, now=NOW, by_mandate=True).start == NOW


# --- the end of a period -----------------------------------------------------------
def _ended(state: str = "ACTIVE", grace_from: datetime | None = None) -> PeriodView:
    return PeriodView(state, NOW - timedelta(days=30), NOW - timedelta(seconds=1), grace_from)


def test_a_period_that_has_not_ended_is_left_alone() -> None:
    running = PeriodView("ACTIVE", NOW - timedelta(days=1), NOW + timedelta(days=1))
    assert (
        period_end_step(
            running,
            cancel_at=None,
            renews=True,
            mandate_active=True,
            now=NOW,
            policy=DEFAULT_POLICY,
        )
        is None
    )


@pytest.mark.parametrize(
    ("cancelled", "renews", "mandate_active", "to_state"),
    [
        (True, False, False, "CANCELLED"),
        (False, True, True, "GRACE"),
        (False, False, False, "LAPSED"),
        # Auto-renew switched on with nothing able to debit is not a renewal
        # in progress, so there is nothing to give grace for.
        (False, True, False, "LAPSED"),
    ],
)
def test_how_an_active_period_ends(
    cancelled: bool, renews: bool, mandate_active: bool, to_state: str
) -> None:
    current = _ended()
    step = period_end_step(
        current,
        cancel_at=current.end if cancelled else None,
        renews=renews,
        mandate_active=mandate_active,
        now=NOW,
        policy=DEFAULT_POLICY,
    )
    assert step is not None and step.to_state == to_state
    if to_state == "GRACE":
        assert current.end is not None
        assert step.grace_from == current.end
        assert step.end == current.end + timedelta(days=DEFAULT_POLICY.grace_days)


def test_grace_ends_in_a_lapse_or_the_cancellation_that_was_asked_for() -> None:
    grace = _ended("GRACE", grace_from=NOW - timedelta(days=4))
    kwargs = {"renews": True, "mandate_active": True, "now": NOW, "policy": DEFAULT_POLICY}
    assert period_end_step(grace, cancel_at=None, **kwargs).to_state == "LAPSED"  # type: ignore[arg-type,union-attr]
    assert period_end_step(grace, cancel_at=NOW, **kwargs).to_state == "CANCELLED"  # type: ignore[arg-type,union-attr]


# --- the mandate renewal cycle -----------------------------------------------------
END = NOW + timedelta(hours=48)


def _action(
    *,
    view: PeriodView | None = None,
    renews: bool = True,
    cancel_at: datetime | None = None,
    mandate_state: str | None = "ACTIVE",
    ceiling: int | None = 14_900,
    price: int = 14_900,
    notice: NoticeView | None = None,
    now: datetime = NOW,
) -> tuple[str, int, str]:
    action = renewal_action(
        view or PeriodView("ACTIVE", NOW - timedelta(days=28), END),
        renews=renews,
        cancel_at=cancel_at,
        mandate_state=mandate_state,
        mandate_ceiling_minor=ceiling,
        price_minor=price,
        latest_notice=notice,
        policy=DEFAULT_POLICY,
        now=now,
    )
    return action.kind, action.attempt, action.reason


def test_nothing_is_debited_without_a_live_mandate_and_auto_renew_on() -> None:
    assert _action(mandate_state=None, ceiling=None)[0] == "NONE"
    assert _action(mandate_state="PENDING")[0] == "NONE"
    assert _action(mandate_state="REVOKED_UNKNOWN")[0] == "NONE"
    assert _action(renews=False)[0] == "NONE"
    assert _action(cancel_at=END)[0] == "NONE"
    lapsed = PeriodView("LAPSED", NOW - timedelta(days=30), NOW - timedelta(days=1))
    assert _action(view=lapsed)[0] == "NONE"


def test_the_first_notice_waits_for_the_lead_time() -> None:
    far = PeriodView("ACTIVE", NOW, NOW + timedelta(days=20))
    assert _action(view=far)[0] == "NONE"
    assert _action() == ("SEND_NOTICE", 1, "")


def test_a_debit_waits_the_full_notice_period() -> None:
    notified = NoticeView(1, "NOTIFIED", NOW + timedelta(hours=MIN_PRE_DEBIT_NOTICE_HOURS))
    assert _action(notice=notified)[0] == "NONE"
    assert (
        _action(notice=notified, now=notified.debit_not_before - timedelta(seconds=1))[0] == "NONE"
    )
    assert _action(notice=notified, now=notified.debit_not_before) == ("REQUEST_DEBIT", 1, "")


def test_a_debit_in_flight_is_not_requested_twice() -> None:
    for state in ("DEBIT_REQUESTED", "SUCCEEDED"):
        assert _action(notice=NoticeView(1, state, NOW - timedelta(hours=1)))[0] == "NONE"


def test_every_retry_gets_its_own_notice_until_the_attempts_run_out() -> None:
    failed = NoticeView(1, "FAILED", NOW - timedelta(hours=1))
    assert _action(notice=failed) == ("SEND_NOTICE", 2, "")
    last = NoticeView(DEFAULT_POLICY.max_debit_attempts, "FAILED", NOW - timedelta(hours=1))
    assert _action(notice=last) == ("FALL_BACK", 0, "debit_attempts_exhausted")


def test_a_price_past_the_mandate_ceiling_falls_back_to_manual_at_once() -> None:
    assert _action(price=19_900) == ("FALL_BACK", 0, "mandate_ceiling_exceeded")
    far = PeriodView("ACTIVE", NOW, NOW + timedelta(days=20))
    assert _action(view=far, price=19_900)[0] == "FALL_BACK"


def test_in_grace_the_renewal_continues_from_the_paid_end_whatever_the_lead_time() -> None:
    grace = PeriodView(
        "GRACE", NOW - timedelta(days=31), NOW + timedelta(days=2), NOW - timedelta(days=1)
    )
    assert _action(view=grace, notice=NoticeView(1, "FAILED", NOW - timedelta(hours=2))) == (
        "SEND_NOTICE",
        2,
        "",
    )


# --- policy -------------------------------------------------------------------------
def test_the_policy_reads_config_and_defaults_what_it_omits() -> None:
    policy = policy_from_config({"grace_days": 5}, version="config-v2")
    assert (policy.grace_days, policy.max_debit_attempts, policy.version) == (
        5,
        DEFAULT_POLICY.max_debit_attempts,
        "config-v2",
    )


@pytest.mark.parametrize(
    "value",
    [
        {"grace_period": 3},
        {"grace_days": True},
        {"grace_days": "3"},
        {"grace_days": -1},
        {"pre_debit_notice_hours": MIN_PRE_DEBIT_NOTICE_HOURS - 1},
        {"notice_lead_hours": 30, "pre_debit_notice_hours": 30},
        {"max_debit_attempts": 0},
    ],
)
def test_a_policy_that_could_debit_early_or_forever_is_refused(value: dict[str, object]) -> None:
    with pytest.raises(RenewalPolicyError):
        policy_from_config(value, version="config-v9")


# --- the stub gateway stays out of deployed environments -----------------------------
@pytest.mark.parametrize("environment", ["staging", "prod"])
def test_the_stub_gateway_refuses_to_boot_in_a_deployed_environment(environment: str) -> None:
    from pydantic import ValidationError

    from app.settings import Settings

    with pytest.raises(ValidationError, match="PAYMENTS_PROVIDER=stub"):
        Settings(
            environment=environment,  # type: ignore[arg-type]
            payments_provider="stub",
            auth_allow_local_tokens=False,
            cognito_candidate_pool_id="ap-south-1_example",
            database_url="postgresql+asyncpg://u:p@localhost:5432/db",  # type: ignore[arg-type]
            redis_url="redis://localhost:6379/0",  # type: ignore[arg-type]
        )
