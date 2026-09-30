"""engagement - Pydantic request/response DTOs

Daily app-open streaks and engagement points. Never the score.

Separate Create / Update / Read schemas. ORM models are never exposed
directly - the schema IS the API contract, and for several modules it is also
where an invariant is enforced structurally.

**No field here is named like the score.** `points_balance`, never `score` or
`value`: a client that rendered engagement points beside the 700-990 number
would invite exactly the confusion `docs/streaks.md` §2 exists to prevent.
`tests/invariants/test_streak_never_moves_the_score.py` reads this module.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import Field

from app.core.schemas import ApiSchema

StreakStatusField = Literal["NONE", "ACTIVE_TODAY", "AT_RISK", "BROKEN"]
PointsKindField = Literal["STREAK_BREAK_PENALTY", "MILESTONE_AWARD"]


class _Base(ApiSchema):
    """Every schema in this module. `ApiSchema` strips the control
    characters Postgres cannot store -- see `app/core/schemas.py`."""


class StreakMilestone(_Base):
    days: int = Field(ge=1)
    points: int = Field(ge=0)


class StreakResponse(_Base):
    """A candidate's streak and engagement points, as of the server's today."""

    status: StreakStatusField = Field(
        description="NONE: never opened. ACTIVE_TODAY: today is counted. AT_RISK: "
        "last counted yesterday, so opening today continues it. BROKEN: a day was "
        "missed; the deduction is applied at the next check-in."
    )
    current_streak: int = Field(ge=0, description="0 once a day has been missed.")
    longest_streak: int = Field(ge=0)
    last_active_on: date | None = None
    today: date = Field(description="The server's calendar day (IST) these values are for.")
    points_balance: int = Field(
        ge=0,
        description="Engagement points. Separate from the candidate score and never added to it.",
    )
    next_milestone: StreakMilestone | None = None
    milestones: list[StreakMilestone]
    break_penalty: int = Field(ge=0)
    rules_version: str


class StreakPointsChangeResponse(_Base):
    kind: PointsKindField
    points: int = Field(description="Applied, signed. A deduction is negative.")
    balance_after: int = Field(ge=0)
    streak_length: int = Field(ge=0, description="The streak broken, or the one reached.")
    milestone_days: int | None = None
    activity_on: date
    created_at: datetime | None = None


class StreakCheckInResponse(_Base):
    counted: bool = Field(
        description="True on the first check-in of the day. Later calls that day change nothing."
    )
    streak: StreakResponse
    changes: list[StreakPointsChangeResponse]


CalendarDayStatusField = Literal[
    "ACTIVE", "MISSED", "TODAY_PENDING", "UPCOMING", "BEFORE_START", "NOT_RETAINED"
]


class StreakCalendarDay(_Base):
    date: date
    status: CalendarDayStatusField = Field(
        description="ACTIVE: the app was opened. MISSED: a past day it was not. "
        "TODAY_PENDING: today, not opened yet -- not missed, the day is not over. "
        "UPCOMING: a future day. BEFORE_START: before the first day ever counted. "
        "NOT_RETAINED: older than a year; opened days are kept for one year."
    )
    milestone_days: int | None = Field(
        default=None, description="The milestone reached that day, on an ACTIVE day only."
    )


class StreakCalendarResponse(_Base):
    """Which days in a range the candidate opened the app. Opened or not:
    there is no count of opens per day."""

    start: date
    end: date
    today: date = Field(description="The server's calendar day (IST).")
    days: list[StreakCalendarDay] = Field(description="Every day from start to end, in order.")
    active_days: int = Field(ge=0, description="Days in the range the app was opened.")
    missed_days: int = Field(ge=0)
    longest_run: int = Field(
        ge=0,
        description="The longest run of consecutive ACTIVE days inside the range. "
        "Not the streak, which can begin before the range does.",
    )
