"""engagement - pure domain logic

Daily app-open streaks and engagement points. Never the score.

No I/O. No database, no HTTP, no clock, no randomness that is not
passed in. mypy runs in strict mode here and import-linter forbids I/O
imports, because this is the layer the invariant property tests
exercise directly.

**Engagement points are not the candidate score, and cannot become it.** The
score is 700-990 by fixed arithmetic (700 + 200 + 30 + 60), replayable from
stored resume inputs, and moved only by bounded, versioned add-ons (invariants
1, 2, 3 and 4-prime). A -10 for a missed day would take a score below its 700
base; milestones would take it past 990; and "opened the app" is not an input
any replay could reproduce. So the points live here, in their own balance, and
`.importlinter` makes `engagement` and `scoring` independent in both
directions. `docs/streaks.md` §2 has the full reasoning.

**The rules are data, the logic is not.** `StreakRules` carries every number
the client may change -- the break deduction and the milestone table -- and is
loaded from `config_values` by the service. `check_in` never names a number.
Changing a value is a config row; changing *how* a streak works is a code
change and a new `rules_version`.

The calendar day is passed in. Which day "today" is for a candidate is a
timezone question, and the timezone is decided in the service, not here.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, replace
from datetime import date, timedelta
from typing import Final, Literal, TypeGuard

# ---------------------------------------------------------------------------
# Rules
# ---------------------------------------------------------------------------

#: The rules shipped in code, used when no `config_values` row exists. The
#: numbers are the client's (2026-09-13); the version names the code default
#: so a ledger row can say which rules produced it.
DEFAULT_RULES_VERSION: Final = "default-v1-2026-09-13"
DEFAULT_BREAK_PENALTY: Final = 10
DEFAULT_MILESTONES: Final[tuple[tuple[int, int], ...]] = ((30, 10), (90, 15), (365, 20))

#: The balance never goes below this. Deliberately **not** configurable: a
#: negative balance is a debt a candidate owes for not opening an app, and that
#: is a product change, not a tuning knob. Also held by a CHECK constraint.
MIN_BALANCE: Final = 0

#: Bounds on configured values. Generous, but finite -- a typo of 1000 for 10
#: in a config row must fail loudly, not quietly wipe every balance.
MAX_RULE_POINTS: Final = 1000
MAX_MILESTONE_DAYS: Final = 3650


class StreakRulesError(ValueError):
    """A rules document that cannot be applied. Raised, never defaulted around:
    silently falling back to code defaults would make the client's change look
    applied when it was not."""


@dataclass(frozen=True, slots=True)
class StreakRules:
    """Every number a streak uses, and the version that names them."""

    version: str
    break_penalty: int = DEFAULT_BREAK_PENALTY
    #: (streak length in days, points awarded on reaching it)
    milestones: tuple[tuple[int, int], ...] = DEFAULT_MILESTONES

    def __post_init__(self) -> None:
        if not self.version.strip():
            raise StreakRulesError("rules must carry a version")
        if not 0 <= self.break_penalty <= MAX_RULE_POINTS:
            raise StreakRulesError(f"break_penalty must be 0-{MAX_RULE_POINTS}")
        seen: set[int] = set()
        for days, points in self.milestones:
            if not 1 <= days <= MAX_MILESTONE_DAYS:
                raise StreakRulesError(f"milestone days must be 1-{MAX_MILESTONE_DAYS}")
            if not 0 <= points <= MAX_RULE_POINTS:
                raise StreakRulesError(f"milestone points must be 0-{MAX_RULE_POINTS}")
            if days in seen:
                raise StreakRulesError(f"milestone at {days} days is listed twice")
            seen.add(days)
        # Normalised, so two documents listing the same milestones in a
        # different order are the same rules.
        object.__setattr__(self, "milestones", tuple(sorted(self.milestones)))

    def milestone_points(self, days: int) -> int | None:
        for milestone_days, points in self.milestones:
            if milestone_days == days:
                return points
        return None

    def next_milestone(self, current_streak: int) -> tuple[int, int] | None:
        for days, points in self.milestones:
            if days > current_streak:
                return days, points
        return None


DEFAULT_RULES: Final = StreakRules(version=DEFAULT_RULES_VERSION)


def rules_from_config(value: Mapping[str, object], *, version: str) -> StreakRules:
    """Parse a `config_values` document into rules. Strict: unknown keys raise.

    Expected shape::

        {"break_penalty": 10,
         "milestones": [{"days": 30, "points": 10}, {"days": 90, "points": 15}]}

    Either key may be omitted to keep the code default for it. An unknown key
    raises because the likeliest cause is a misspelling (`break_penality`),
    and ignoring it would leave the old value live while the row looked right.
    """
    unknown = set(value) - {"break_penalty", "milestones"}
    if unknown:
        raise StreakRulesError(f"unknown streak rule keys: {sorted(unknown)}")

    penalty = value.get("break_penalty", DEFAULT_BREAK_PENALTY)
    if not _is_int(penalty):
        raise StreakRulesError("break_penalty must be an integer")

    raw_milestones = value.get("milestones")
    milestones: tuple[tuple[int, int], ...]
    if raw_milestones is None:
        milestones = DEFAULT_MILESTONES
    elif isinstance(raw_milestones, list):
        parsed: list[tuple[int, int]] = []
        for entry in raw_milestones:
            if not isinstance(entry, Mapping) or set(entry) != {"days", "points"}:
                raise StreakRulesError("each milestone must be {days, points}")
            days, points = entry["days"], entry["points"]
            if not _is_int(days) or not _is_int(points):
                raise StreakRulesError("milestone days and points must be integers")
            parsed.append((days, points))
        milestones = tuple(parsed)
    else:
        raise StreakRulesError("milestones must be a list")

    return StreakRules(version=version, break_penalty=penalty, milestones=milestones)


def _is_int(value: object) -> TypeGuard[int]:
    # `True` is an int in Python; a rules document saying `"points": true` is
    # a mistake, not the number one.
    return isinstance(value, int) and not isinstance(value, bool)


# ---------------------------------------------------------------------------
# State and outcomes
# ---------------------------------------------------------------------------

PointsKind = Literal["STREAK_BREAK_PENALTY", "MILESTONE_AWARD"]
StreakStatus = Literal["NONE", "ACTIVE_TODAY", "AT_RISK", "BROKEN"]


@dataclass(frozen=True, slots=True)
class StreakState:
    current_streak: int = 0
    longest_streak: int = 0
    last_active_on: date | None = None
    streak_started_on: date | None = None
    points_balance: int = 0
    #: The first day ever counted. Never moves once set, so the calendar can
    #: tell a day before the candidate started from a day they missed.
    first_active_on: date | None = None


@dataclass(frozen=True, slots=True)
class PointsChange:
    """One ledger entry. `points` is what was applied, signed; `requested` is
    what the rules asked for. They differ only when the balance floor clipped a
    deduction, and storing both is what makes that visible afterwards."""

    kind: PointsKind
    points: int
    requested: int
    streak_length: int
    streak_started_on: date | None
    milestone_days: int | None
    balance_after: int


@dataclass(frozen=True, slots=True)
class CheckInOutcome:
    state: StreakState
    #: False when today was already counted -- the common case, since a
    #: client reports every app open.
    counted: bool
    changes: tuple[PointsChange, ...] = ()


def check_in(state: StreakState, *, today: date, rules: StreakRules) -> CheckInOutcome:
    """Record that the candidate opened the app on `today`.

    * Already counted today: nothing changes. Idempotent by calendar day.
    * Last active yesterday: the streak continues.
    * Any longer gap, with a streak to lose: the streak breaks, the deduction
      is applied **once** however many days were missed, and today starts a
      new streak of 1.
    * First ever open: a streak of 1, no deduction -- there was nothing to
      break.
    * A milestone is awarded when the streak *reaches* its length, so each is
      earned once per run and can be earned again after a break.

    `today` earlier than the last active day (a clock or timezone correction)
    is ignored rather than treated as a break. Punishing a candidate for our
    clock moving is the wrong way round.
    """
    last = state.last_active_on
    if last is not None and today <= last:
        return CheckInOutcome(state=state, counted=False)

    changes: list[PointsChange] = []
    balance = state.points_balance

    if last is not None and last == today - timedelta(days=1):
        current = state.current_streak + 1
        started = state.streak_started_on or today
    else:
        if last is not None and state.current_streak > 0 and rules.break_penalty > 0:
            applied = min(rules.break_penalty, max(0, balance - MIN_BALANCE))
            balance -= applied
            changes.append(
                PointsChange(
                    kind="STREAK_BREAK_PENALTY",
                    points=-applied,
                    requested=-rules.break_penalty,
                    streak_length=state.current_streak,
                    streak_started_on=state.streak_started_on,
                    milestone_days=None,
                    balance_after=balance,
                )
            )
        current = 1
        started = today

    award = rules.milestone_points(current)
    if award is not None and award > 0:
        balance += award
        changes.append(
            PointsChange(
                kind="MILESTONE_AWARD",
                points=award,
                requested=award,
                streak_length=current,
                streak_started_on=started,
                milestone_days=current,
                balance_after=balance,
            )
        )

    new_state = replace(
        state,
        current_streak=current,
        longest_streak=max(state.longest_streak, current),
        last_active_on=today,
        streak_started_on=started,
        points_balance=balance,
        first_active_on=state.first_active_on or today,
    )
    return CheckInOutcome(state=new_state, counted=True, changes=tuple(changes))


# ---------------------------------------------------------------------------
# The read view
# ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class StreakView:
    """What a candidate sees, computed without writing anything.

    A break is only *applied* at the next check-in, but it is *shown*
    immediately: a candidate who last opened the app three days ago sees a
    current streak of 0 and status BROKEN, not a stale 12.
    """

    status: StreakStatus
    current_streak: int
    longest_streak: int
    last_active_on: date | None
    points_balance: int
    next_milestone: tuple[int, int] | None


def view(state: StreakState, *, today: date, rules: StreakRules) -> StreakView:
    last = state.last_active_on
    if last is None:
        status: StreakStatus = "NONE"
        current = 0
    elif last >= today:
        status, current = "ACTIVE_TODAY", state.current_streak
    elif last == today - timedelta(days=1):
        status, current = "AT_RISK", state.current_streak
    else:
        status, current = "BROKEN", 0

    return StreakView(
        status=status,
        current_streak=current,
        longest_streak=state.longest_streak,
        last_active_on=last,
        points_balance=state.points_balance,
        next_milestone=rules.next_milestone(current),
    )


# ---------------------------------------------------------------------------
# The activity calendar
# ---------------------------------------------------------------------------

#: How far back a candidate's opened days are kept: today and the 365 days
#: before it. The client's decision (2026-09-29). A daily sweep deletes older
#: days through `purge_streak_activity_days`, which freezes this number in
#: SQL; `test_streak_calendar.py` holds the two equal.
ACTIVITY_RETENTION_DAYS: Final = 365

#: The widest range one calendar request may ask for: the whole retained
#: window, so a year view is one call.
MAX_CALENDAR_DAYS: Final = ACTIVITY_RETENTION_DAYS + 1

CalendarPeriod = Literal["week", "month", "year"]
CalendarDayStatus = Literal[
    "ACTIVE", "MISSED", "TODAY_PENDING", "UPCOMING", "BEFORE_START", "NOT_RETAINED"
]


class CalendarRangeError(ValueError):
    """A calendar request that names no usable range."""


def retained_since(today: date) -> date:
    """The earliest day still kept on `today`."""
    return today - timedelta(days=ACTIVITY_RETENTION_DAYS)


def period_range(period: CalendarPeriod, anchor: date) -> tuple[date, date]:
    """The days a named period covers, around `anchor`.

    * week: Monday to Sunday, the week the mobile strip draws.
    * month: the calendar month.
    * year: the retained window ending on `anchor` -- rolling, as LeetCode's
      "past year" is. A calendar year would be mostly NOT_RETAINED.
    """
    if period == "week":
        start = anchor - timedelta(days=anchor.weekday())
        return start, start + timedelta(days=6)
    if period == "month":
        start = anchor.replace(day=1)
        following = (start + timedelta(days=32)).replace(day=1)
        return start, following - timedelta(days=1)
    return anchor - timedelta(days=ACTIVITY_RETENTION_DAYS), anchor


def resolve_range(
    *,
    today: date,
    period: CalendarPeriod | None = None,
    anchor: date | None = None,
    start: date | None = None,
    end: date | None = None,
) -> tuple[date, date]:
    """Which days a request asked for. Either an explicit `start`/`end`, or a
    `period` around `anchor`; neither means this week."""
    if start is not None or end is not None:
        if period is not None or anchor is not None:
            raise CalendarRangeError("give from/to or period/date, not both")
        if start is None or end is None:
            raise CalendarRangeError("from and to go together")
    else:
        try:
            start, end = period_range(period or "week", anchor or today)
        except OverflowError as exc:  # a date at the edge of the calendar
            raise CalendarRangeError("date is out of range") from exc
    if start > end:
        raise CalendarRangeError("from is after to")
    if (end - start).days + 1 > MAX_CALENDAR_DAYS:
        raise CalendarRangeError(f"at most {MAX_CALENDAR_DAYS} days at once")
    return start, end


@dataclass(frozen=True, slots=True)
class CalendarDay:
    day: date
    status: CalendarDayStatus
    #: The milestone reached that day, if one was.
    milestone_days: int | None = None


@dataclass(frozen=True, slots=True)
class CalendarView:
    start: date
    end: date
    today: date
    days: tuple[CalendarDay, ...]
    active_days: int
    missed_days: int
    #: The longest run of consecutive ACTIVE days inside the range. Not the
    #: streak: a run can begin before the range does.
    longest_run: int


def day_status(
    day: date, *, today: date, first_active_on: date | None, active: bool
) -> CalendarDayStatus:
    """One day's status. The order matters: a day not yet lived is never
    missed, a day no longer kept is never guessed at, and a day before the
    candidate first opened the app is not one they missed."""
    if day > today:
        return "UPCOMING"
    if day < retained_since(today):
        return "NOT_RETAINED"
    if active:
        return "ACTIVE"
    if first_active_on is None or day < first_active_on:
        return "BEFORE_START"
    if day == today:
        return "TODAY_PENDING"
    return "MISSED"


def calendar_view(
    *,
    start: date,
    end: date,
    today: date,
    first_active_on: date | None,
    active: frozenset[date],
    milestones: Mapping[date, int],
) -> CalendarView:
    """Every day from `start` to `end`, with its status."""
    days: list[CalendarDay] = []
    run = longest = 0
    day = start
    while day <= end:
        status = day_status(day, today=today, first_active_on=first_active_on, active=day in active)
        days.append(
            CalendarDay(
                day=day,
                status=status,
                milestone_days=milestones.get(day) if status == "ACTIVE" else None,
            )
        )
        run = run + 1 if status == "ACTIVE" else 0
        longest = max(longest, run)
        day += timedelta(days=1)
    return CalendarView(
        start=start,
        end=end,
        today=today,
        days=tuple(days),
        active_days=sum(1 for d in days if d.status == "ACTIVE"),
        missed_days=sum(1 for d in days if d.status == "MISSED"),
        longest_run=longest,
    )
