"""scoring - HTTP layer

Engine interface, versions, history, breakdown.

Routes only. No business logic, no repository access.
import-linter enforces the second half of that sentence.

**There is one candidate-facing route and it returns a number.** No breakdown
endpoint, no category detail, no "how to improve" -- the client confirmed the
score is never explained (2026-08-27, re-confirmed 2026-09-11). A route that
served the stored breakdown would satisfy every test in this repository except
`test_score_never_explained.py`, which is why that test reads the schemas
rather than trusting this docstring.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.core.deps import (
    CANDIDATE,
    CurrentUser,
    DbSession,
    require_active_subscription,
    require_role,
)
from app.modules.scoring import service
from app.modules.scoring.domain import band_for, display_value
from app.modules.scoring.schemas import CandidateScoreResponse

router = APIRouter()

CandidateOnly = Depends(require_role(CANDIDATE))


@router.get(
    "/me",
    response_model=CandidateScoreResponse,
    status_code=status.HTTP_200_OK,
    dependencies=[CandidateOnly, Depends(require_active_subscription)],
    summary="The candidate's own score",
)
async def my_score(user: CurrentUser, session: DbSession) -> CandidateScoreResponse:
    """200 with PENDING rather than 404 when nothing is computed yet.

    A candidate who has confirmed a resume is waiting for a job to finish, not
    looking at a missing resource — and every scoring failure resolves to
    PENDING too, because we never serve a partial or degraded number.

    **Pay-first (R13): seeing your own score needs an active subscription.** A
    lapsed subscriber gets 402; their score history is kept, not deleted.
    """
    row = await service.get_latest(session, user_id=user.user_id)
    if row is None:
        return CandidateScoreResponse(status="PENDING")

    # `display_value` is applied here and nowhere else. Invariant 2: what is
    # stored is what was computed, and the floor is a serialization concern.
    return CandidateScoreResponse(
        status="READY",
        value=display_value(row.raw_value),
        band=band_for(row.raw_value),
        computed_at=row.computed_at,
    )
