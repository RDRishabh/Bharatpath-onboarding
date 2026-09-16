"""discovery - HTTP layer

Masked search, access-window checks, reveal audit.

Routes only. No business logic, no repository access.
import-linter enforces the second half of that sentence.

**Who searches.** Owners and recruiters, the two actors SRS 1.14.1 names.
Viewers read the organisation's jobs and pipeline, but candidate search is the
surface a bulk-extraction attempt would use, so it is not widened past the
spec by default. Searching needs an active subscription (R15).

**Opening a profile is `GET /employer/discovery/candidates/{candidate_id}`**,
mounted from the `candidate` module because the response needs the display
score and this module may not import `scoring`. The checks, the caps and the
audit row are this module's (`service.open_candidate`).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.deps import (
    EMPLOYER_OWNER,
    EMPLOYER_RECRUITER,
    CurrentUser,
    DbSession,
    require_active_subscription,
    require_role,
)
from app.core.pagination import MAX_PAGE_SIZE, Page
from app.modules.discovery import service
from app.modules.discovery.domain import MAX_EXPERIENCE_YEARS, MAX_SKILL_FILTERS
from app.modules.discovery.schemas import Badge, MaskedCandidate, ScoreBand

router = APIRouter()

Searchers = Depends(require_role(EMPLOYER_OWNER, EMPLOYER_RECRUITER))


@router.get(
    "/candidates",
    response_model=Page[MaskedCandidate],
    dependencies=[Searchers, Depends(require_active_subscription)],
    summary="Search candidates, masked",
)
async def search_candidates(
    user: CurrentUser,
    session: DbSession,
    band: Annotated[list[ScoreBand] | None, Query(max_length=4)] = None,
    skill: Annotated[
        list[str] | None,
        Query(max_length=MAX_SKILL_FILTERS, description="Every one must match"),
    ] = None,
    badge: Annotated[list[Badge] | None, Query(max_length=2)] = None,
    min_experience_years: Annotated[int | None, Query(ge=0, le=MAX_EXPERIENCE_YEARS)] = None,
    state: Annotated[str | None, Query(min_length=2, max_length=2)] = None,
    city: Annotated[str | None, Query(max_length=100)] = None,
    q: Annotated[str | None, Query(max_length=100, description="Words in a skill")] = None,
    cursor: Annotated[str | None, Query(max_length=512)] = None,
    limit: Annotated[int | None, Query(ge=1, le=MAX_PAGE_SIZE)] = None,
) -> Page[MaskedCandidate]:
    """Anonymised candidate cards: band, experience, skills, location, badges.

    **Never a name, phone, email or score** -- the card has no field for them.
    Stronger bands first; within a band the order carries no meaning. Only
    candidates employers may see at all are searched (`VISIBLE_CANDIDATES_CTE`).
    No `total` is returned.
    """
    return await service.search_candidates(
        session,
        ctx=user,
        bands=list(band or []),
        skills=list(skill or []),
        badges=list(badge or []),
        min_experience_years=min_experience_years,
        state_code=state,
        city=city,
        query=q,
        cursor=cursor,
        limit=limit,
    )
