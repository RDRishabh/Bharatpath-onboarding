"""candidate - HTTP layer

Candidate profile, settings, language preference.

Routes only. No business logic, no repository access.
import-linter enforces the second half of that sentence.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Request

from app.core.deps import (
    CANDIDATE,
    EMPLOYER_OWNER,
    EMPLOYER_RECRUITER,
    CurrentUser,
    DbSession,
    get_request_id,
    require_active_access_window,
    require_role,
)
from app.modules.candidate import service
from app.modules.candidate.schemas import (
    CandidateProfileResponse,
    LocationRequest,
    RevealedCandidate,
)

router = APIRouter()
#: Mounted at `/employer/discovery`, beside masked search (`__init__.py`).
employer_router = APIRouter()

CandidateOnly = Depends(require_role(CANDIDATE))
#: The same two roles as search, then the access window: one check, one place
#: (invariant 7). The window is the employer's subscription, read live.
Revealers = [
    Depends(require_role(EMPLOYER_OWNER, EMPLOYER_RECRUITER)),
    Depends(require_active_access_window),
]


@router.get(
    "/profile",
    response_model=CandidateProfileResponse,
    dependencies=[CandidateOnly],
    summary="The candidate's own profile",
)
async def get_profile(user: CurrentUser, session: DbSession) -> CandidateProfileResponse:
    return await service.get_profile(session, ctx=user)


@router.put(
    "/profile/location",
    response_model=CandidateProfileResponse,
    dependencies=[CandidateOnly],
    summary="Set where the candidate is",
)
async def set_location(
    payload: LocationRequest, user: CurrentUser, session: DbSession
) -> CandidateProfileResponse:
    """A city and a state, both optional. Employers see them on a masked card
    and filter by them, so a city carrying digits or `@` is refused (422)."""
    return await service.set_location(session, ctx=user, payload=payload)


@employer_router.get(
    "/candidates/{candidate_id}",
    response_model=RevealedCandidate,
    dependencies=Revealers,
    summary="Open one candidate's profile",
)
async def reveal_candidate(
    candidate_id: uuid.UUID, request: Request, user: CurrentUser, session: DbSession
) -> RevealedCandidate:
    """Name, contact details and the display score of one candidate, **audited**.

    Every call writes an audit row, re-opens included. Refusals: no access
    window (402 `access_window_expired`), unverified organisation (403
    `kyb_required`), too fast (429 `rate_limited`), the organisation's view
    cap (429 `view_cap_reached`, `params.window`), and a candidate employers
    cannot see (404 `candidate_not_found`). One candidate per request; there
    is no list form.
    """
    return await service.reveal_to_employer(
        session, ctx=user, candidate_id=candidate_id, request_id=get_request_id(request)
    )
