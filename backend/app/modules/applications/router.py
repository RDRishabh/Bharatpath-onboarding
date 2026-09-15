"""applications - HTTP layer

Apply, stages, withdraw, expiry, hire confirm.

Routes only. No business logic, no repository access.
import-linter enforces the second half of that sentence.

**The candidate's own applications**, at `/candidate/applications`. Applying is
behind the subscription (R13); reading and withdrawing are not, because a
lapsed subscriber loses access, not their data -- see the service docstring.
Another candidate's application is a 404.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from app.core.deps import (
    CANDIDATE,
    CurrentUser,
    DbSession,
    require_active_subscription,
    require_role,
)
from app.core.pagination import MAX_PAGE_SIZE, Page
from app.modules.applications import service
from app.modules.applications.schemas import ApplicationResponse, ApplyRequest

router = APIRouter()

CandidateOnly = Depends(require_role(CANDIDATE))
# The role guard first, so an employer is told 403 rather than asked to pay.
PayingCandidate = [CandidateOnly, Depends(require_active_subscription)]


@router.post(
    "",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=PayingCandidate,
    summary="Apply to a published job",
    responses={200: {"description": "Already applied; the existing application"}},
)
async def apply(
    payload: ApplyRequest, response: Response, user: CurrentUser, session: DbSession
) -> ApplicationResponse:
    """201 for a new application, 200 with the same one on a repeat.

    Refusals: 404 `job_not_found` (not on the board), 409 `score_pending`,
    409 `application_unavailable`, 403 `eligibility_below_threshold` -- the
    last one without any number, because the score is never explained.
    """
    application, created = await service.apply(session, ctx=user, job_id=payload.job_id)
    if not created:
        response.status_code = status.HTTP_200_OK
    return application


@router.get(
    "",
    response_model=Page[ApplicationResponse],
    dependencies=[CandidateOnly],
    summary="The candidate's applications, newest first",
)
async def list_mine(
    user: CurrentUser,
    session: DbSession,
    cursor: Annotated[str | None, Query(max_length=512)] = None,
    limit: Annotated[int | None, Query(ge=1, le=MAX_PAGE_SIZE)] = None,
) -> Page[ApplicationResponse]:
    return await service.list_mine(session, ctx=user, cursor=cursor, limit=limit)


@router.get(
    "/{application_id}",
    response_model=ApplicationResponse,
    dependencies=[CandidateOnly],
    summary="One of the candidate's applications",
)
async def get_mine(
    application_id: uuid.UUID, user: CurrentUser, session: DbSession
) -> ApplicationResponse:
    return await service.get_mine(session, ctx=user, application_id=application_id)


@router.post(
    "/{application_id}/withdraw",
    response_model=ApplicationResponse,
    dependencies=[CandidateOnly],
    summary="Withdraw an application",
)
async def withdraw(
    application_id: uuid.UUID, user: CurrentUser, session: DbSession
) -> ApplicationResponse:
    """Any stage before the outcome. Repeating it returns the withdrawn
    application; 409 for one already hired, rejected or expired."""
    return await service.withdraw(session, ctx=user, application_id=application_id)
