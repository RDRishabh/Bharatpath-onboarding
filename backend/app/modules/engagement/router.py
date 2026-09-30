"""engagement - HTTP layer

Daily app-open streaks and engagement points. Never the score.

Routes only. No business logic, no repository access.
import-linter enforces the second half of that sentence.

The client calls `POST /me/check-in` when the app opens (or returns to the
foreground). The day it counts for is the server's IST date; the request
carries no date, because one that did could keep a streak alive forever.

**Not behind `require_active_subscription`, deliberately for now.** If it
were, a lapsed subscriber could not check in, and would lose their streak and
points for not paying rather than for not opening the app. That is a client
decision (`docs/streaks.md` §7, S4), not a default to slip in.
"""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query, status

from app.core.deps import CANDIDATE, CurrentUser, DbSession, require_role
from app.modules.engagement import service
from app.modules.engagement.domain import CalendarPeriod
from app.modules.engagement.schemas import (
    StreakCalendarDay,
    StreakCalendarResponse,
    StreakCheckInResponse,
    StreakMilestone,
    StreakPointsChangeResponse,
    StreakResponse,
)

router = APIRouter()

CandidateOnly = Depends(require_role(CANDIDATE))


def _streak_response(summary: service.StreakSummary) -> StreakResponse:
    current = summary.view
    upcoming = current.next_milestone
    return StreakResponse(
        status=current.status,
        current_streak=current.current_streak,
        longest_streak=current.longest_streak,
        last_active_on=current.last_active_on,
        today=summary.today,
        points_balance=current.points_balance,
        next_milestone=StreakMilestone(days=upcoming[0], points=upcoming[1]) if upcoming else None,
        milestones=[StreakMilestone(days=d, points=p) for d, p in summary.rules.milestones],
        break_penalty=summary.rules.break_penalty,
        rules_version=summary.rules.version,
    )


@router.get(
    "/me",
    response_model=StreakResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[CandidateOnly],
    summary="The candidate's streak and engagement points",
)
async def my_streak(user: CurrentUser, session: DbSession) -> StreakResponse:
    """Read-only. Never counts today -- only a check-in does."""
    summary = await service.get_streak(session, user_id=user.user_id)
    return _streak_response(summary)


@router.post(
    "/me/check-in",
    response_model=StreakCheckInResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[CandidateOnly],
    summary="Record that the candidate opened the app today",
)
async def check_in(user: CurrentUser, session: DbSession) -> StreakCheckInResponse:
    """200, not 201, and idempotent by calendar day: call it on every app open.

    `changes` lists what today's first check-in did to the balance -- a
    deduction for a broken streak, a milestone award, both, or nothing.
    """
    result = await service.record_app_open(session, user_id=user.user_id)
    return StreakCheckInResponse(
        counted=result.counted,
        streak=_streak_response(result.summary),
        changes=[
            StreakPointsChangeResponse(
                kind=change.kind,
                points=change.points,
                balance_after=change.balance_after,
                streak_length=change.streak_length,
                milestone_days=change.milestone_days,
                activity_on=result.summary.today,
            )
            for change in result.changes
        ],
    )


@router.get(
    "/me/points",
    response_model=list[StreakPointsChangeResponse],
    dependencies=[CandidateOnly],
    summary="The candidate's engagement-points history, newest first",
)
async def point_history(
    user: CurrentUser,
    session: DbSession,
    limit: int = Query(default=50, ge=1, le=200),
) -> list[StreakPointsChangeResponse]:
    rows = await service.list_point_history(session, user_id=user.user_id, limit=limit)
    return [StreakPointsChangeResponse.model_validate(row) for row in rows]


@router.get(
    "/me/calendar",
    response_model=StreakCalendarResponse,
    dependencies=[CandidateOnly],
    summary="Which days the candidate opened the app, for a week, month, year or range",
)
async def calendar(
    user: CurrentUser,
    session: DbSession,
    period: CalendarPeriod | None = Query(
        default=None,
        description="week (Monday to Sunday), month, or year (the 366 days ending on `date`). "
        "Defaults to this week when neither a period nor a range is given.",
    ),
    anchor: date | None = Query(
        default=None, alias="date", description="The day the period is around. Defaults to today."
    ),
    start: date | None = Query(
        default=None, alias="from", description="With `to`, instead of a period."
    ),
    end: date | None = Query(default=None, alias="to"),
) -> StreakCalendarResponse:
    """Read-only; never counts today. At most 366 days (`domain.MAX_CALENDAR_DAYS`) at once,
    and days older than a year come back NOT_RETAINED."""
    result = await service.get_calendar(
        session, user_id=user.user_id, period=period, anchor=anchor, start=start, end=end
    )
    return StreakCalendarResponse(
        start=result.start,
        end=result.end,
        today=result.today,
        days=[
            StreakCalendarDay(date=d.day, status=d.status, milestone_days=d.milestone_days)
            for d in result.days
        ],
        active_days=result.active_days,
        missed_days=result.missed_days,
        longest_run=result.longest_run,
    )
