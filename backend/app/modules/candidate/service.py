"""candidate - business rules and transaction boundaries

Candidate profile, settings, language preference.

Services own the transaction. They never touch `Request`, and anything that
reveals private data writes its audit row on the same session before the
transaction closes.

**The profile is not paywalled**, like reading and withdrawing applications:
a lapsed subscriber loses access, not the ability to keep their own details
right.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import PermissionDeniedError
from app.core.tenant import TenantContext
from app.modules.candidate import repository
from app.modules.candidate.schemas import CandidateProfileResponse, LocationRequest


def _candidate(ctx: TenantContext) -> None:
    if ctx.tenant_id is not None or ctx.role != "CANDIDATE":
        raise PermissionDeniedError()


async def get_profile(session: AsyncSession, *, ctx: TenantContext) -> CandidateProfileResponse:
    """The candidate's own profile. Empty, not 404, before anything is saved."""
    _candidate(ctx)
    profile = await repository.get_profile(session, user_id=ctx.user_id)
    if profile is None:
        return CandidateProfileResponse()
    return CandidateProfileResponse.model_validate(profile)


async def set_location(
    session: AsyncSession, *, ctx: TenantContext, payload: LocationRequest
) -> CandidateProfileResponse:
    """Replace the location. It reaches masked search on the next query --
    search reads the profile live rather than copying it anywhere."""
    _candidate(ctx)
    profile = await repository.set_location(
        session, user_id=ctx.user_id, city=payload.city, state_code=payload.state_code
    )
    return CandidateProfileResponse.model_validate(profile)
