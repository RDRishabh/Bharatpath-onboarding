"""Streak rules, as pure functions. No database.

The numbers the client gave (2026-09-13) are asserted once, against
`DEFAULT_RULES`. Every other test builds its own `StreakRules`, so changing a
number in config breaks only the test that pins the default -- which is the
"configurable without touching the core logic" promise, tested rather than
claimed.
"""

from __future__ import annotations

import random
from datetime import UTC, date, datetime, timedelta

import pytest

from app.modules.engagement.domain import (
    DEFAULT_RULES,
    MIN_BALANCE,
    PointsChange,
    StreakRules,
    StreakRulesError,
    StreakState,
    check_in,
    rules_from_config,
    view,
)

D0 = date(2026, 1, 1)
RULES = StreakRules(version="test", break_penalty=10, milestones=((30, 10), (90, 15), (365, 20)))


def day(n: int) -> date:
    return D0 + timedelta(days=n)


def run(
    days: list[int], rules: StreakRules = RULES, state: StreakState | None = None
) -> tuple[StreakState, list[PointsChange]]:
    """Check in on each listed day offset, in order."""
    current = state or StreakState()
    changes: list[PointsChange] = []
    for n in days:
        outcome = check_in(current, today=day(n), rules=rules)
        current = outcome.state
        changes.extend(outcome.changes)
    return current, changes


# --- the client's numbers -------------------------------------------------
def test_the_default_rules_are_the_clients_numbers() -> None:
    """The one test that encodes the values. Changing them is a config row."""
    assert DEFAULT_RULES.break_penalty == 10
    assert DEFAULT_RULES.milestones == ((30, 10), (90, 15), (365, 20))


# --- continuing -----------------------------------------------------------
def test_the_first_open_starts_a_streak_of_one_with_no_deduction() -> None:
    """Nothing to break yet, so nothing to deduct."""
    outcome = check_in(StreakState(), today=D0, rules=RULES)
    assert outcome.counted
    assert outcome.state.current_streak == 1
    assert outcome.state.longest_streak == 1
    assert outcome.state.streak_started_on == D0
    assert outcome.changes == ()


def test_consecutive_days_extend_the_streak() -> None:
    state, changes = run([0, 1, 2, 3, 4])
    assert state.current_streak == 5
    assert state.streak_started_on == D0
    assert changes == []


def test_opening_twice_in_a_day_counts_once() -> None:
    """The client reports every app open, so this is the common path."""
    first = check_in(StreakState(), today=D0, rules=RULES)
    second = check_in(first.state, today=D0, rules=RULES)
    assert not second.counted
    assert second.state == first.state


def test_a_day_earlier_than_the_last_one_is_ignored_not_a_break() -> None:
    """A clock correction must not cost the candidate points."""
    state, _ = run([0, 1, 2])
    outcome = check_in(state, today=day(1), rules=RULES)
    assert not outcome.counted
    assert outcome.state == state


# --- breaking -------------------------------------------------------------
def test_missing_one_day_breaks_the_streak_and_deducts() -> None:
    state = StreakState(
        current_streak=5,
        longest_streak=5,
        last_active_on=day(4),
        streak_started_on=D0,
        points_balance=40,
    )
    outcome = check_in(state, today=day(6), rules=RULES)

    assert outcome.state.current_streak == 1
    assert outcome.state.streak_started_on == day(6)
    assert outcome.state.points_balance == 30
    (change,) = outcome.changes
    assert change.kind == "STREAK_BREAK_PENALTY"
    assert change.points == -10
    assert change.streak_length == 5, "the ledger records the streak that was lost"


def test_a_long_gap_deducts_once_not_once_per_missed_day() -> None:
    state = StreakState(current_streak=3, longest_streak=3, last_active_on=D0, points_balance=100)
    outcome = check_in(state, today=day(40), rules=RULES)
    assert outcome.state.points_balance == 90
    assert len(outcome.changes) == 1


def test_the_longest_streak_survives_a_break() -> None:
    state, _ = run([*range(0, 12), *range(20, 23)])
    assert state.current_streak == 3
    assert state.longest_streak == 12


def test_the_balance_never_goes_below_zero() -> None:
    """A new candidate who misses a day owes nothing. The ledger still says a
    deduction was due, so the clipping is visible rather than silent."""
    state, changes = run([0, 1, 5])
    assert state.points_balance == MIN_BALANCE == 0
    (change,) = changes
    assert change.points == 0
    assert change.requested == -10


def test_a_deduction_larger_than_the_balance_takes_only_what_is_there() -> None:
    state = StreakState(current_streak=2, longest_streak=2, last_active_on=D0, points_balance=4)
    outcome = check_in(state, today=day(3), rules=RULES)
    assert outcome.state.points_balance == 0
    assert outcome.changes[0].points == -4


def test_a_zero_penalty_records_no_deduction() -> None:
    rules = StreakRules(version="t", break_penalty=0, milestones=())
    _, changes = run([0, 1, 9], rules=rules)
    assert changes == []


# --- milestones -----------------------------------------------------------
@pytest.mark.parametrize(("days", "points"), [(30, 10), (90, 15), (365, 20)])
def test_each_milestone_awards_its_points_on_the_day_it_is_reached(days: int, points: int) -> None:
    before, _ = run(list(range(days - 1)))
    outcome = check_in(before, today=day(days - 1), rules=RULES)
    award = [c for c in outcome.changes if c.kind == "MILESTONE_AWARD"]
    assert [(c.milestone_days, c.points) for c in award] == [(days, points)]


def test_a_full_year_earns_every_milestone_once() -> None:
    state, changes = run(list(range(400)))
    assert state.current_streak == 400
    assert [(c.milestone_days, c.points) for c in changes] == [(30, 10), (90, 15), (365, 20)]
    assert state.points_balance == 45


def test_a_milestone_can_be_earned_again_after_a_break() -> None:
    """Once per streak run, not once per lifetime. 30 days (+10), a missed
    day (-10), 30 more (+10)."""
    state, changes = run([*range(0, 30), *range(31 + 1, 31 + 1 + 30)])
    assert [c.kind for c in changes] == [
        "MILESTONE_AWARD",
        "STREAK_BREAK_PENALTY",
        "MILESTONE_AWARD",
    ]
    assert state.points_balance == 10


def test_the_milestone_records_which_run_earned_it() -> None:
    _, changes = run(list(range(30)))
    assert changes[0].streak_started_on == D0


# --- configurable ---------------------------------------------------------
def test_other_numbers_change_behaviour_without_changing_code() -> None:
    rules = StreakRules(version="custom", break_penalty=3, milestones=((2, 7),))
    state, changes = run([0, 1, 5], rules=rules)
    assert [(c.kind, c.points) for c in changes] == [
        ("MILESTONE_AWARD", 7),
        ("STREAK_BREAK_PENALTY", -3),
    ]
    assert state.points_balance == 4


def test_without_a_milestone_at_thirty_nothing_is_awarded_at_thirty() -> None:
    """The logic names no number. Remove the milestone and the award goes."""
    rules = StreakRules(version="t", milestones=((90, 15),))
    _, changes = run(list(range(30)), rules=rules)
    assert changes == []


@pytest.mark.parametrize(
    ("kwargs", "why"),
    [
        ({"break_penalty": -1}, "a negative penalty would award points for missing a day"),
        ({"break_penalty": 5000}, "a typo must fail loudly, not wipe every balance"),
        ({"milestones": ((0, 5),)}, "a zero-day milestone"),
        ({"milestones": ((30, -5),)}, "a milestone that deducts"),
        ({"milestones": ((30, 5), (30, 9))}, "two values for one milestone"),
        ({"version": " "}, "rules nobody can name"),
    ],
)
def test_unusable_rules_are_refused(kwargs: dict[str, object], why: str) -> None:
    args: dict[str, object] = {"version": "t", **kwargs}
    with pytest.raises(StreakRulesError):
        StreakRules(**args)  # type: ignore[arg-type]


def test_milestones_are_normalised_to_ascending_order() -> None:
    rules = StreakRules(version="t", milestones=((365, 20), (30, 10)))
    assert rules.milestones == ((30, 10), (365, 20))


def test_rules_parse_from_a_config_document() -> None:
    rules = rules_from_config(
        {"break_penalty": 5, "milestones": [{"days": 7, "points": 2}]}, version="config-v3"
    )
    assert rules == StreakRules(version="config-v3", break_penalty=5, milestones=((7, 2),))


def test_an_omitted_key_keeps_the_code_default() -> None:
    rules = rules_from_config({"break_penalty": 5}, version="v")
    assert rules.milestones == DEFAULT_RULES.milestones


def test_an_empty_milestone_list_means_no_milestones() -> None:
    assert rules_from_config({"milestones": []}, version="v").milestones == ()


@pytest.mark.parametrize(
    "document",
    [
        {"break_penality": 5},
        {"break_penalty": "10"},
        {"break_penalty": True},
        {"milestones": {"30": 10}},
        {"milestones": [{"days": 30}]},
        {"milestones": [{"days": 30, "points": 10, "bonus": 1}]},
        {"milestones": [{"days": 30.0, "points": 10}]},
    ],
)
def test_a_malformed_config_document_raises(document: dict[str, object]) -> None:
    """A misspelt key ignored would leave the old value live while the row
    looked right."""
    with pytest.raises(StreakRulesError):
        rules_from_config(document, version="v")


# --- the read view --------------------------------------------------------
def test_view_of_a_candidate_who_never_opened_the_app() -> None:
    v = view(StreakState(), today=D0, rules=RULES)
    assert (v.status, v.current_streak, v.next_milestone) == ("NONE", 0, (30, 10))


def test_view_today_and_yesterday() -> None:
    state, _ = run([0, 1, 2])
    assert view(state, today=day(2), rules=RULES).status == "ACTIVE_TODAY"
    at_risk = view(state, today=day(3), rules=RULES)
    assert (at_risk.status, at_risk.current_streak) == ("AT_RISK", 3)


def test_a_broken_streak_shows_zero_before_the_deduction_is_applied() -> None:
    """The deduction lands at the next check-in; the display must not wait."""
    state = StreakState(current_streak=12, longest_streak=12, last_active_on=D0, points_balance=30)
    v = view(state, today=day(5), rules=RULES)
    assert (v.status, v.current_streak, v.longest_streak) == ("BROKEN", 0, 12)
    assert v.points_balance == 30
    assert v.next_milestone == (30, 10)


def test_there_is_no_next_milestone_after_the_last() -> None:
    state, _ = run(list(range(366)))
    assert view(state, today=day(365), rules=RULES).next_milestone is None


# --- properties -----------------------------------------------------------
@pytest.mark.parametrize("seed", range(25))
def test_any_pattern_of_opens_keeps_the_books_straight(seed: int) -> None:
    """Across random gaps: the balance is never negative, longest never trails
    current, and the ledger alone reproduces the balance."""
    rng = random.Random(seed)
    offsets, n = [], 0
    for _ in range(300):
        n += rng.choice([0, 1, 1, 1, 1, 2, 3, 15])
        offsets.append(n)

    rules = StreakRules(version="p", break_penalty=rng.randint(0, 30), milestones=((3, 4), (9, 2)))
    state, changes = run(offsets, rules=rules)

    assert state.points_balance >= 0
    assert state.longest_streak >= state.current_streak
    assert sum(c.points for c in changes) == state.points_balance
    assert all(c.balance_after >= 0 for c in changes)


# --- the day boundary (service helper, no database) -----------------------
def test_the_day_turns_over_at_midnight_ist_not_utc() -> None:
    from app.modules.engagement.service import local_day

    assert local_day(datetime(2026, 1, 1, 18, 29, 59, tzinfo=UTC)) == date(2026, 1, 1)
    assert local_day(datetime(2026, 1, 1, 18, 30, 0, tzinfo=UTC)) == date(2026, 1, 2)


def test_a_naive_datetime_is_refused() -> None:
    from app.modules.engagement.service import local_day

    with pytest.raises(ValueError):
        local_day(datetime(2026, 1, 1, 12, 0))
