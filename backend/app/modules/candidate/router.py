"""candidate - HTTP layer

Candidate profile, settings, language preference.

Routes only. No business logic, no repository access.
import-linter enforces the second half of that sentence.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.deps import CANDIDATE, CurrentUser, DbSession, require_role
from app.modules.candidate import service
from app.modules.candidate.schemas import CandidateProfileResponse, LocationRequest

router = APIRouter()

CandidateOnly = Depends(require_role(CANDIDATE))


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
