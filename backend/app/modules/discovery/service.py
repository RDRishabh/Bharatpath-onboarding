"""discovery - business rules and transaction boundaries

Masked search, access-window checks, reveal audit.

Services own the transaction. They never touch `Request`, and anything that
reveals private data writes its audit row on the same session before the
transaction closes.

Day 9 landed the rule everything here is built on: which candidates are
visible at all, with high-severity integrity suppression inside it. Day 13
adds masked search on top of it. The reveal -- and the access window, the view
caps and the audit row that come with it -- is Day 14.

**Masked search writes no audit row, deliberately.** A card carries nothing
PRD rule 9 calls private: no name, no contact, no score. What it does expose
is the shape of the pool, which is why it is rate-limited per organisation and
returns no total.
"""

from __future__ import annotations

import uuid
from typing import Any, Final

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import set_transaction_tenant
from app.core.errors import KybRequiredError, PermissionDeniedError, ValidationError
from app.core.pagination import Page, clamp_limit, decode_cursor, encode_cursor
from app.core.ratelimit import hit
from app.core.tenant import TenantContext
from app.modules.candidate.domain import STATE_CODES
from app.modules.discovery import repository
from app.modules.discovery.domain import MAX_SKILL_LENGTH, experience_years, skill_key
from app.modules.discovery.schemas import MaskedCandidate
from app.modules.employer import service as employer_service

#: Search pages per organisation per hour, shared by its whole team. Generous
#: for people screening candidates, and a ceiling on walking the pool page by
#: page. Day 14 moves the abuse controls into config; this is the floor under
#: them until then.
SEARCH_PAGES_PER_HOUR: Final = 300


class InvalidStateFilterError(ValidationError):
    code = "discovery_state_invalid"
    title = "Not a state or union territory code"


class InvalidSkillFilterError(ValidationError):
    code = "discovery_skill_invalid"
    title = "A skill filter is empty or too long"


async def visible_candidate_ids(
    session: AsyncSession, *, limit: int | None = None, after: uuid.UUID | None = None
) -> list[uuid.UUID]:
    return await repository.visible_candidate_ids(session, limit=clamp_limit(limit), after=after)


async def is_candidate_visible(session: AsyncSession, *, candidate_id: uuid.UUID) -> bool:
    return await repository.is_candidate_visible(session, candidate_id=candidate_id)


async def count_visible_at_or_above(session: AsyncSession, *, min_score: int) -> int:
    return await repository.count_visible_at_or_above(session, min_score=min_score)


# ---------------------------------------------------------------------------
# Masked search (Day 13)
# ---------------------------------------------------------------------------
def _cursor_of(row: Any) -> str:
    return encode_cursor({"r": int(row.band_rank), "i": str(row.user_id)})


def _after(cursor: str | None) -> tuple[int, uuid.UUID] | None:
    if cursor is None:
        return None
    payload = decode_cursor(cursor)
    try:
        rank = payload["r"]
        if not isinstance(rank, int) or isinstance(rank, bool):
            raise ValueError("rank")
        return rank, uuid.UUID(str(payload["i"]))
    except (KeyError, ValueError) as exc:
        raise ValidationError(code="invalid_cursor") from exc


def _card(row: Any) -> MaskedCandidate:
    return MaskedCandidate(
        candidate_id=row.user_id,
        band=row.band,
        experience_years=experience_years(int(row.experience_months)),
        skills=list(row.skills),
        badges=sorted(row.badges),
        city=row.city,
        state_code=row.state_code,
    )


async def search_candidates(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    bands: list[str] | None = None,
    skills: list[str] | None = None,
    badges: list[str] | None = None,
    min_experience_years: int | None = None,
    state_code: str | None = None,
    city: str | None = None,
    query: str | None = None,
    cursor: str | None = None,
    limit: int | None = None,
) -> Page[MaskedCandidate]:
    """Visible candidates as masked cards, filtered, keyset-paginated.

    Refusals, in order: no organisation (403), unverified organisation (403
    `kyb_required` -- SRS 1.14.1 checks "KYB/search eligibility" before search),
    a malformed filter (422), too many pages this hour (429).

    **No total**, on purpose (`app/core/pagination.py`): a count of candidates
    matching a narrow filter tells an employer whether one particular person is
    in the pool.
    """
    if ctx.tenant_id is None:
        raise PermissionDeniedError()
    await set_transaction_tenant(session, ctx.tenant_id)

    kyb_status = await employer_service.kyb_status(session, ctx=ctx)
    if kyb_status != "APPROVED":
        raise KybRequiredError(params={"kyb_status": kyb_status})

    if state_code is not None and state_code not in STATE_CODES:
        raise InvalidStateFilterError(params={"state": state_code})
    keys: set[str] = set()
    for skill in skills or []:
        key = skill_key(skill)
        if not key or len(key) > MAX_SKILL_LENGTH:
            raise InvalidSkillFilterError()
        keys.add(key)

    await hit(
        bucket="discovery:search",
        subject=str(ctx.tenant_id),
        limit=SEARCH_PAGES_PER_HOUR,
        window_seconds=3600,
    )

    page_size = clamp_limit(limit)
    rows = await repository.search_candidates(
        session,
        bands=sorted(set(bands or [])),
        skill_keys=sorted(keys),
        badges=sorted(set(badges or [])),
        min_experience_months=None if min_experience_years is None else min_experience_years * 12,
        state_code=state_code,
        city=city.strip() or None if city is not None else None,
        query=query.strip() or None if query is not None else None,
        after=_after(cursor),
        limit=page_size + 1,
    )
    page, more = rows[:page_size], len(rows) > page_size
    return Page[MaskedCandidate](
        items=[_card(row) for row in page],
        next_cursor=_cursor_of(page[-1]) if more and page else None,
    )
