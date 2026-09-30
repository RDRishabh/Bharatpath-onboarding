"""The streak calendar, as pure functions. No database.

What a day is shown as matters more than it looks: a day before somebody
started, or one not over yet, drawn as MISSED tells them they failed at
something they never had the chance to do.
"""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from app.modules.engagement.domain import (
    ACTIVITY_RETENTION_DAYS,
    MAX_CALENDAR_DAYS,
    CalendarRangeError,
    StreakRules,
    StreakState,
    calendar_view,
    check_in,
    day_status,
    period_range,
    resolve_range,
    retained_since,
)

RULES = StreakRules(version="test", break_penalty=10, milestones=((30, 10),))

#: A Tuesday.
TODAY = date(2026, 9, 29)


def ago(n: int) -> date:
    return TODAY - timedelta(days=n)


# --- the retention number is the client's --------------------------------
def test_a_year_of_days_is_kept() -> None:
    """Client, 2026-09-29: keep the days for one year."""
    assert ACTIVITY_RETENTION_DAYS == 365
    assert retained_since(TODAY) == date(2025, 9, 29)
    assert MAX_CALENDAR_DAYS == 366


# --- periods ---------------------------------------------------------------
def test_a_week_runs_monday_to_sunday() -> None:
    assert period_range("week", TODAY) == (date(2026, 9, 28), date(2026, 10, 4))
    assert period_range("week", date(2026, 9, 28)) == (date(2026, 9, 28), date(2026, 10, 4))
    assert period_range("week", date(2026, 10, 4)) == (date(2026, 9, 28), date(2026, 10, 4))


@pytest.mark.parametrize(
    ("anchor", "expected"),
    [
        (date(2026, 9, 29), (date(2026, 9, 1), date(2026, 9, 30))),
        (date(2026, 1, 31), (date(2026, 1, 1), date(2026, 1, 31))),
        (date(2028, 2, 10), (date(2028, 2, 1), date(2028, 2, 29))),
        (date(2026, 12, 25), (date(2026, 12, 1), date(2026, 12, 31))),
    ],
)
def test_a_month_is_the_calendar_month(anchor: date, expected: tuple[date, date]) -> None:
    assert period_range("month", anchor) == expected


def test_a_year_is_the_retained_window_ending_on_the_anchor() -> None:
    start, end = period_range("year", TODAY)
    assert (start, end) == (retained_since(TODAY), TODAY)
    assert (end - start).days + 1 == MAX_CALENDAR_DAYS


# --- which range a request asked for ---------------------------------------
def test_nothing_asked_for_is_this_week() -> None:
    assert resolve_range(today=TODAY) == period_range("week", TODAY)


def test_a_period_defaults_to_today() -> None:
    assert resolve_range(today=TODAY, period="month") == period_range("month", TODAY)


def test_an_explicit_range_is_used_as_given() -> None:
    assert resolve_range(today=TODAY, start=ago(10), end=ago(3)) == (ago(10), ago(3))


@pytest.mark.parametrize(
    "kwargs",
    [
        {"start": ago(3)},
        {"end": ago(3)},
        {"start": ago(3), "end": ago(1), "period": "week"},
        {"start": ago(3), "end": ago(1), "anchor": ago(2)},
        {"start": ago(1), "end": ago(3)},
        {"start": ago(MAX_CALENDAR_DAYS), "end": TODAY},
    ],
    ids=["from-alone", "to-alone", "range-and-period", "range-and-date", "backwards", "too-long"],
)
def test_an_unusable_range_is_refused(kwargs: dict[str, object]) -> None:
    with pytest.raises(CalendarRangeError):
        resolve_range(today=TODAY, **kwargs)  # type: ignore[arg-type]


@pytest.mark.parametrize(
    ("period", "anchor"), [("year", date.min), ("week", date.max), ("month", date.max)]
)
def test_a_date_at_the_edge_of_the_calendar_is_refused_not_a_500(period: str, anchor: date) -> None:
    with pytest.raises(CalendarRangeError):
        resolve_range(today=TODAY, period=period, anchor=anchor)  # type: ignore[arg-type]


def test_the_widest_range_is_allowed() -> None:
    start = TODAY - timedelta(days=MAX_CALENDAR_DAYS - 1)
    assert resolve_range(today=TODAY, start=start, end=TODAY) == (start, TODAY)


# --- a day's status ----------------------------------------------------------
@pytest.mark.parametrize(
    ("day", "first", "active", "expected"),
    [
        (TODAY + timedelta(days=1), ago(10), False, "UPCOMING"),
        (TODAY, ago(10), True, "ACTIVE"),
        (TODAY, ago(10), False, "TODAY_PENDING"),
        (ago(1), ago(10), False, "MISSED"),
        (ago(1), ago(10), True, "ACTIVE"),
        (ago(11), ago(10), False, "BEFORE_START"),
        (ago(1), None, False, "BEFORE_START"),
        (TODAY, None, False, "BEFORE_START"),
        (ago(ACTIVITY_RETENTION_DAYS), ago(400), False, "MISSED"),
        (ago(ACTIVITY_RETENTION_DAYS + 1), ago(400), False, "NOT_RETAINED"),
        (ago(ACTIVITY_RETENTION_DAYS + 1), ago(400), True, "NOT_RETAINED"),
    ],
)
def test_day_status(day: date, first: date | None, active: bool, expected: str) -> None:
    assert day_status(day, today=TODAY, first_active_on=first, active=active) == expected


def test_a_day_not_over_is_never_missed() -> None:
    """Even for someone whose streak broke yesterday."""
    assert day_status(TODAY, today=TODAY, first_active_on=ago(30), active=False) != "MISSED"


# --- the whole view ------------------------------------------------------------
def test_the_week_in_the_screenshot() -> None:
    """First ever open on Monday 28 September; viewed that day."""
    monday = date(2026, 9, 28)
    start, end = period_range("week", monday)
    view = calendar_view(
        start=start,
        end=end,
        today=monday,
        first_active_on=monday,
        active=frozenset({monday}),
        milestones={},
    )
    assert [d.status for d in view.days] == ["ACTIVE"] + ["UPCOMING"] * 6
    assert (view.active_days, view.missed_days, view.longest_run) == (1, 0, 1)


def test_every_day_in_the_range_is_listed_in_order() -> None:
    view = calendar_view(
        start=ago(20),
        end=TODAY,
        today=TODAY,
        first_active_on=ago(20),
        active=frozenset(),
        milestones={},
    )
    assert [d.day for d in view.days] == [ago(n) for n in range(20, -1, -1)]


def test_counts_and_the_longest_run_inside_the_range() -> None:
    active = frozenset({ago(9), ago(8), ago(7), ago(5), ago(4), ago(1), TODAY})
    view = calendar_view(
        start=ago(9),
        end=TODAY,
        today=TODAY,
        first_active_on=ago(30),
        active=active,
        milestones={},
    )
    assert view.active_days == 7
    assert view.missed_days == 3  # 6, 3 and 2 days ago
    assert view.longest_run == 3


def test_a_milestone_is_marked_on_its_active_day_only() -> None:
    view = calendar_view(
        start=ago(2),
        end=TODAY,
        today=TODAY,
        first_active_on=ago(40),
        active=frozenset({ago(1)}),
        milestones={ago(1): 30, ago(2): 90},
    )
    assert [d.milestone_days for d in view.days] == [None, 30, None]


# --- check-in records the first day, and never moves it ---------------------------
def test_the_first_check_in_sets_the_first_day_and_later_ones_keep_it() -> None:
    first = check_in(StreakState(), today=ago(5), rules=RULES).state
    assert first.first_active_on == ago(5)
    later = check_in(first, today=ago(1), rules=RULES).state  # after a break
    assert later.first_active_on == ago(5)
