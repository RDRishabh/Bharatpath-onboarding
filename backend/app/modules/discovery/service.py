"""discovery - business rules and transaction boundaries

Masked search, access-window checks, reveal audit.

Services own the transaction. They never touch `Request`, and anything that
reveals private data writes its audit row on the same session before the
transaction closes.

Day 9 landed the rule everything here is built on: which candidates are
visible at all, with high-severity integrity suppression inside it. Day 13
adds masked search on top of it, and Day 14 the reveal: the view caps, the
view log and the audit row that make opening a profile safe to allow at all.

**Masked search writes no audit row, deliberately.** A card carries nothing
PRD rule 9 calls private: no name, no contact, no score. What it does expose
is the shape of the pool, which is why it is rate-limited per organisation and
returns no total.

**Opening a profile always writes one** (invariant 7'), in the same
transaction as the read. The profile itself is assembled by
`candidate.service.reveal_to_employer`, because it needs the display score and
this module may not import `scoring`; everything that decides whether the
reveal happens is here.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Final

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditAction, audit_event
from app.core.db import set_transaction_tenant
from app.core.errors import (
    AppError,
    KybRequiredError,
    NotFoundError,
    PermissionDeniedError,
    RateLimitedError,
    ValidationError,
)
from app.core.logging import get_logger
from app.core.outbox import emit
from app.core.pagination import Page, clamp_limit, decode_cursor, encode_cursor
from app.core.ratelimit import hit
from app.core.tenant import TenantContext
from app.modules.candidate.domain import STATE_CODES
from app.modules.discovery import repository
from app.modules.discovery.domain import (
    DEFAULT_LIMITS,
    MAX_SKILL_LENGTH,
    DiscoveryLimits,
    DiscoveryLimitsError,
    ViewCounts,
    anomalies,
    cap_refusal,
    experience_years,
    limits_from_config,
    skill_key,
)
from app.modules.discovery.schemas import MaskedCandidate
from app.modules.employer import service as employer_service

logger = get_logger(__name__)

#: The `config_values` key holding `DiscoveryLimits`. Insert a higher
#: `version` to change a number.
LIMITS_CONFIG_KEY: Final = "discovery.limits"

#: Emitted when a view crosses a velocity or cap threshold, for the admin
#: console and notifications to consume.
VIEW_ANOMALY_FLAGGED: Final = "discovery.view_anomaly_flagged"

#: Months of view-log partitions the maintenance task keeps ahead of today.
PARTITION_MONTHS_AHEAD: Final = 3


class InvalidStateFilterError(ValidationError):
    code = "discovery_state_invalid"
    title = "Not a state or union territory code"


class InvalidSkillFilterError(ValidationError):
    code = "discovery_skill_invalid"
    title = "A skill filter is empty or too long"


class DiscoveryLimitsInvalidError(AppError):
    """The configured limits cannot be applied. A 500, deliberately: falling
    back to the defaults would make a broken row look applied, and these are
    the controls in front of the whole candidate pool."""

    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    code = "discovery_limits_invalid"
    title = "Discovery limits are misconfigured"


class ViewCapReachedError(RateLimitedError):
    """The organisation has opened as many distinct candidates as its cap allows.

    `params.window` is `HOURLY` or `DAILY`. Distinct from `rate_limited`,
    which is one person clicking too fast and clears in a minute; this is the
    organisation's allowance and clears as the rolling window moves.
    """

    code = "view_cap_reached"
    title = "Candidate view limit reached"


class CandidateNotFoundError(NotFoundError):
    code = "candidate_not_found"
    title = "Candidate not found"


async def load_limits(session: AsyncSession, *, now: datetime) -> DiscoveryLimits:
    """The limits in force at `now`: the latest config row, else the defaults."""
    row = await repository.current_config(session, key=LIMITS_CONFIG_KEY, now=now)
    if row is None:
        return DEFAULT_LIMITS
    try:
        if not isinstance(row.value, dict):
            raise DiscoveryLimitsError("discovery limits must be a JSON object")
        return limits_from_config(row.value)
    except DiscoveryLimitsError as exc:
        logger.error("discovery_limits_invalid", config_version=row.version, error=str(exc))
        raise DiscoveryLimitsInvalidError() from exc


async def _verified_employer(session: AsyncSession, ctx: TenantContext) -> uuid.UUID:
    """Bind the caller's tenant and require approved KYB, for search and reveal alike.

    SRS 1.14.1 checks "KYB/search eligibility" before search. With approval
    switched off (R15) every employer is approved on creation, so this bites
    only when the client turns the switch on -- and then it must bite on the
    reveal as well as the search.
    """
    if ctx.tenant_id is None:
        raise PermissionDeniedError()
    await set_transaction_tenant(session, ctx.tenant_id)
    kyb_status = await employer_service.kyb_status(session, ctx=ctx)
    if kyb_status != "APPROVED":
        raise KybRequiredError(params={"kyb_status": kyb_status})
    return ctx.tenant_id


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
    tenant_id = await _verified_employer(session, ctx)

    if state_code is not None and state_code not in STATE_CODES:
        raise InvalidStateFilterError(params={"state": state_code})
    keys: set[str] = set()
    for skill in skills or []:
        key = skill_key(skill)
        if not key or len(key) > MAX_SKILL_LENGTH:
            raise InvalidSkillFilterError()
        keys.add(key)

    limits = await load_limits(session, now=datetime.now(UTC))
    await hit(
        bucket="discovery:search",
        subject=str(tenant_id),
        limit=limits.search_pages_per_hour,
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


# ---------------------------------------------------------------------------
# The reveal (Day 14)
# ---------------------------------------------------------------------------
@dataclass(frozen=True, slots=True)
class OpenedCandidate:
    """What discovery hands over once a reveal is allowed, logged and audited.

    It carries the score's id and not its value. The number an employer sees
    is `scoring.domain.display_value`, applied where the response is built.
    """

    candidate_id: uuid.UUID
    resume_version_id: uuid.UUID
    score_id: uuid.UUID
    phone: str | None
    email: str | None
    #: As given at sign-up; None if the candidate has not given one.
    full_name: str | None
    band: str
    experience_years: int
    skills: list[str]
    badges: list[str]
    city: str | None
    state_code: str | None


async def open_candidate(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    candidate_id: uuid.UUID,
    request_id: str | None = None,
) -> OpenedCandidate:
    """Allow, log and audit one employer opening one candidate's profile.

    The access window is checked before this is reached
    (`require_active_access_window`, on the route). Then, in order:

      1. an approved organisation (403 `kyb_required`);
      2. one person's burst limit, in Redis (429 `rate_limited`);
      3. the organisation's hourly and daily caps on distinct candidates
         (429 `view_cap_reached`) -- **before** looking the candidate up, so a
         capped organisation learns nothing, not even whether an id exists;
      4. the candidate is visible under the discovery rule (404
         `candidate_not_found`);
      5. the view event, the audit row and any anomaly alert, **on this
         session**: if any write fails, the reveal rolls back with it.

    Candidates only ever arrive one at a time. There is no batch form of this
    and there must not be one: export is not a feature (plan.md Day 14).
    """
    tenant_id = await _verified_employer(session, ctx)
    limits = await load_limits(session, now=datetime.now(UTC))

    await hit(
        bucket="discovery:reveal",
        subject=str(ctx.user_id),
        limit=limits.reveals_per_minute,
        window_seconds=60,
    )

    await repository.lock_tenant_views(session, tenant_id=tenant_id)
    row = await repository.view_counts(
        session,
        tenant_id=tenant_id,
        actor_id=ctx.user_id,
        candidate_id=candidate_id,
        velocity_minutes=limits.velocity_window_minutes,
    )
    counts = ViewCounts(
        tenant_last_hour=int(row.tenant_last_hour),
        tenant_last_day=int(row.tenant_last_day),
        actor_in_window=int(row.actor_in_window),
        seen_by_tenant_last_hour=bool(row.seen_by_tenant_last_hour),
        seen_by_tenant_last_day=bool(row.seen_by_tenant_last_day),
        seen_by_actor_in_window=bool(row.seen_by_actor_in_window),
    )
    refused = cap_refusal(limits, counts)
    if refused is not None:
        logger.warning("candidate_view_cap_reached", tenant_id=str(tenant_id), window=refused)
        raise ViewCapReachedError(params={"window": refused})

    revealed = await repository.revealed_candidate(session, candidate_id=candidate_id)
    if revealed is None or not await repository.record_view(
        session, tenant_id=tenant_id, actor_id=ctx.user_id, candidate_id=candidate_id
    ):
        raise CandidateNotFoundError()

    await audit_event(
        session,
        action=AuditAction.CANDIDATE_PROFILE_VIEWED,
        actor_id=ctx.user_id,
        actor_role=ctx.role,
        target_type="candidate",
        target_id=candidate_id,
        tenant_id=tenant_id,
        request_id=request_id,
        # Identifiers only: which score and which CV the employer was shown.
        metadata={
            "score_id": str(revealed.score_id),
            "resume_version_id": str(revealed.resume_version_id),
        },
    )
    for kind in anomalies(limits, counts):
        await _flag_anomaly(
            session, ctx=ctx, tenant_id=tenant_id, kind=kind, limits=limits, request_id=request_id
        )

    return OpenedCandidate(
        candidate_id=revealed.user_id,
        resume_version_id=revealed.resume_version_id,
        score_id=revealed.score_id,
        phone=revealed.phone,
        email=revealed.email,
        full_name=revealed.full_name,
        band=revealed.band,
        experience_years=experience_years(int(revealed.experience_months)),
        skills=list(revealed.skills),
        badges=sorted(revealed.badges),
        city=revealed.city,
        state_code=revealed.state_code,
    )


async def _flag_anomaly(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    tenant_id: uuid.UUID,
    kind: str,
    limits: DiscoveryLimits,
    request_id: str | None,
) -> None:
    """Alert a human. **An alert blocks nothing**: the caps do the blocking,
    and an alert that also refused would be a cap nobody configured."""
    detail: dict[str, Any] = (
        {"views": limits.velocity_views, "window_minutes": limits.velocity_window_minutes}
        if kind == "ACTOR_VELOCITY"
        else {"views": limits.views_per_day, "window_minutes": 24 * 60}
    )
    await audit_event(
        session,
        action=AuditAction.CANDIDATE_VIEW_ANOMALY_FLAGGED,
        actor_id=ctx.user_id,
        actor_role=ctx.role,
        target_type="tenant",
        target_id=tenant_id,
        tenant_id=tenant_id,
        request_id=request_id,
        metadata={"kind": kind, **detail},
    )
    await emit(
        session,
        event_type=VIEW_ANOMALY_FLAGGED,
        aggregate_type="tenant",
        aggregate_id=tenant_id,
        payload={"tenant_id": str(tenant_id), "actor_id": str(ctx.user_id), "kind": kind, **detail},
    )
    logger.warning("candidate_view_anomaly_flagged", tenant_id=str(tenant_id), kind=kind)


async def ensure_view_partitions(session: AsyncSession, *, now: datetime) -> int:
    """Keep the view log's monthly partitions `PARTITION_MONTHS_AHEAD` ahead."""
    first_month = now.astimezone(UTC).date().replace(day=1)
    return await repository.ensure_view_partitions(
        session, first_month=first_month, months=PARTITION_MONTHS_AHEAD + 1
    )
