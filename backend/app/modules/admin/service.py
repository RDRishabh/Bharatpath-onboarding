"""admin - business rules and transaction boundaries

Queues, drill-downs, disputes, suspensions.

Services own the transaction. They never touch `Request`, and anything that
reveals private data writes its audit row on the same session before the
transaction closes.

**The shape of every cross-tenant read** (`_reveal`): write the audit row on
the request's own transaction, then open the read-only bypass session and
read. The audit row therefore exists before anything is read, commits or
rolls back with the request, and names the member of staff, their role and
the target. A console read with no audit row is not a code path that exists.

**Writes stay in the owning module.** A KYB decision is `kyb.service.review`,
a resolution is `integrity.service.resolve_signal`, seats are
`college.service.allocate_seats`, a suspension is `identity.service`. The
console decides who may press the button and records that they did; the rules
about what the button does live where they always did, and so do their tests.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditAction, audit_event
from app.core.db import get_admin_session_factory, set_transaction_tenant, set_transaction_user
from app.core.errors import AppError, NotFoundError, PermissionDeniedError, ValidationError
from app.core.logging import get_logger
from app.core.outbox import emit
from app.core.pagination import clamp_limit, decode_cursor, encode_cursor
from app.core.ratelimit import hit
from app.core.tenant import TenantContext
from app.modules.admin import repository
from app.modules.admin.domain import (
    CLOSED_DISPUTE_STATES,
    DISPUTE_STATES,
    dispute_refusal,
    dispute_transition_refusal,
    mask_email,
    mask_phone,
    party_for_role,
)
from app.modules.admin.events import (
    DISPUTE_CLOSED,
    DISPUTE_OPENED,
    TENANT_REINSTATED,
    TENANT_SUSPENDED,
)
from app.modules.admin.models import Dispute
from app.modules.admin.schemas import (
    ApplicationLink,
    AuditEventRow,
    AuditEventsPage,
    CandidateDrilldown,
    CollegeDrilldown,
    CollegeLinkSummary,
    DisputeDetail,
    DisputeLinks,
    DisputeRow,
    DisputesPage,
    EmployerDrilldown,
    IntegritySignalDetail,
    IntegritySignalRow,
    IntegritySignalsPage,
    KybSubmissionRow,
    KybSubmissionsPage,
    KybSummary,
    MyDisputeResponse,
    ResumeSummary,
    ScoreSummary,
    SeatAllocationResponse,
    SeatSummary,
    SignalCount,
    SubscriptionSummary,
    SuspensionResponse,
    SuspensionSummary,
    TenantRow,
    TenantsPage,
)
from app.modules.college import service as college_service
from app.modules.discovery import service as discovery_service
from app.modules.identity import service as identity_service
from app.modules.integrity import service as integrity_service
from app.modules.jobs import service as jobs_service
from app.modules.kyb import service as kyb_service
from app.modules.kyb.schemas import KybSubmissionResponse
from app.modules.scoring.domain import band_for, display_value

logger = get_logger(__name__)

#: A dispute is a support ticket with consequences; five a day per person is
#: generous for a real grievance and a ceiling for someone flooding the queue.
DISPUTES_PER_DAY = 5
HIRE_DISPUTE_DESCRIPTION = "The candidate says this hire did not happen."


class DisputeNotFoundError(NotFoundError):
    code = "dispute_not_found"
    title = "Dispute not found"


class DisputeApplicationNotFoundError(NotFoundError):
    code = "dispute_application_not_found"
    title = "Application not found"


class DisputeRefusedError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    code = "dispute_refused"
    title = "This dispute cannot be raised"


class DisputeStateError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "dispute_transition_invalid"
    title = "The dispute cannot move to that state"


class CandidateNotFoundError(NotFoundError):
    code = "admin_candidate_not_found"
    title = "Candidate not found"


class OrganisationNotFoundError(NotFoundError):
    code = "admin_organisation_not_found"
    title = "Organisation not found"


class KybSubmissionNotFoundError(NotFoundError):
    code = "kyb_submission_not_found"
    title = "KYB submission not found"


def _now(now: datetime | None) -> datetime:
    return now or datetime.now(UTC)


async def _bind_platform(session: AsyncSession, ctx: TenantContext) -> None:
    """Bind the caller's own tenant -- which, for a staff role, can only be the
    PLATFORM tenant (`guard_membership_tenant_type`). The dispute policy for
    staff reads that binding; nothing else does."""
    if ctx.tenant_id is None:
        raise PermissionDeniedError()
    await set_transaction_tenant(session, ctx.tenant_id)


@asynccontextmanager
async def _reveal(
    session: AsyncSession,
    ctx: TenantContext,
    *,
    action: AuditAction,
    target_type: str,
    target_id: uuid.UUID | str | None,
    tenant_id: uuid.UUID | None = None,
    request_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> AsyncIterator[AsyncSession]:
    """Audit, then open the read-only bypass session. See the module docstring."""
    await audit_event(
        session,
        action=action,
        actor_id=ctx.user_id,
        actor_role=ctx.role,
        target_type=target_type,
        target_id=target_id,
        tenant_id=tenant_id,
        request_id=request_id,
        metadata=metadata,
    )
    await session.flush()
    async with get_admin_session_factory()() as reader, reader.begin():
        await reader.execute(text("SET TRANSACTION READ ONLY"))
        yield reader


def _keyset(cursor: str | None, *, id_type: type = uuid.UUID) -> tuple[datetime, Any] | None:
    if cursor is None:
        return None
    payload = decode_cursor(cursor)
    try:
        return datetime.fromisoformat(str(payload["t"])), id_type(payload["i"])
    except (KeyError, ValueError, TypeError) as exc:
        raise ValidationError(code="invalid_cursor") from exc


def _next(rows: list[Any], limit: int, *, at: str) -> str | None:
    if len(rows) < limit:
        return None
    last = rows[-1]
    return encode_cursor({"t": last[at].isoformat(), "i": str(last["id"])})


# ---------------------------------------------------------------------------
# KYB
# ---------------------------------------------------------------------------
async def kyb_submissions(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    state: str | None,
    cursor: str | None,
    limit: int | None,
    request_id: str | None = None,
    now: datetime | None = None,
) -> KybSubmissionsPage:
    """Every organisation's submissions. **A record while approval is
    automatic** (R15, plan v4): the switch is shown with the page so a
    reviewer knows whether anything here is waiting on them."""
    size = clamp_limit(limit)
    review_required = await kyb_service.require_approval(session, now=_now(now))
    async with _reveal(
        session,
        ctx,
        action=AuditAction.ADMIN_BYPASS_SESSION_OPENED,
        target_type="kyb_submissions",
        target_id=None,
        request_id=request_id,
        metadata={"view": "kyb_submissions", "state": state},
    ) as reader:
        rows = await repository.kyb_submissions(
            reader, state=state, after=_keyset(cursor), limit=size
        )
    return KybSubmissionsPage(
        items=[KybSubmissionRow.model_validate(dict(r)) for r in rows],
        next_cursor=_next(rows, size, at="created_at"),
        review_required=review_required,
    )


async def _submission_tenant(
    session: AsyncSession, ctx: TenantContext, submission_id: uuid.UUID, request_id: str | None
) -> uuid.UUID:
    async with _reveal(
        session,
        ctx,
        action=AuditAction.ADMIN_KYB_SUBMISSION_OPENED,
        target_type="kyb_submission",
        target_id=submission_id,
        request_id=request_id,
    ) as reader:
        tenant_id = await repository.kyb_submission_tenant(reader, submission_id=submission_id)
    if tenant_id is None:
        raise KybSubmissionNotFoundError()
    return tenant_id


async def open_kyb_submission(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    submission_id: uuid.UUID,
    request_id: str | None = None,
) -> KybSubmissionResponse:
    tenant_id = await _submission_tenant(session, ctx, submission_id, request_id)
    return await kyb_service.submission_for_review(
        session, tenant_id=tenant_id, submission_id=submission_id
    )


async def decide_kyb(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    submission_id: uuid.UUID,
    decision: str,
    reason: str | None,
    request_id: str | None = None,
) -> KybSubmissionResponse:
    """`kyb.service.review` decides and audits; this finds the tenant."""
    tenant_id = await _submission_tenant(session, ctx, submission_id, request_id)
    return await kyb_service.review(
        session,
        tenant_id=tenant_id,
        submission_id=submission_id,
        reviewer_id=ctx.user_id,
        reviewer_role=ctx.role,
        decision=decision,
        reason=reason,
    )


# ---------------------------------------------------------------------------
# Integrity
# ---------------------------------------------------------------------------
async def integrity_queue(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    state: str,
    severity: str | None,
    cursor: str | None,
    limit: int | None,
    request_id: str | None = None,
) -> IntegritySignalsPage:
    size = clamp_limit(limit)
    async with _reveal(
        session,
        ctx,
        action=AuditAction.ADMIN_BYPASS_SESSION_OPENED,
        target_type="integrity_signals",
        target_id=None,
        request_id=request_id,
        metadata={"view": "integrity_queue", "state": state, "severity": severity},
    ) as reader:
        rows = await repository.integrity_signals(
            reader, state=state, severity=severity, after=_keyset(cursor), limit=size
        )
    return IntegritySignalsPage(
        items=[IntegritySignalRow.model_validate(dict(r)) for r in rows],
        next_cursor=_next(rows, size, at="created_at"),
    )


async def open_signal(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    signal_id: uuid.UUID,
    request_id: str | None = None,
) -> IntegritySignalDetail:
    async with _reveal(
        session,
        ctx,
        action=AuditAction.ADMIN_INTEGRITY_SIGNAL_OPENED,
        target_type="integrity_signal",
        target_id=signal_id,
        request_id=request_id,
    ) as reader:
        row = await repository.integrity_signal(reader, signal_id=signal_id)
    if row is None:
        raise integrity_service.SignalNotFoundError()
    return IntegritySignalDetail.model_validate(dict(row))


async def resolve_signal(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    signal_id: uuid.UUID,
    outcome: str,
    note: str | None,
) -> IntegritySignalDetail:
    """Only CLEARED restores the candidate to search; CONFIRMED keeps them
    hidden. `integrity.service.resolve_signal` audits the decision."""
    row = await integrity_service.resolve_signal(
        session,
        signal_id=signal_id,
        reviewer_id=ctx.user_id,
        reviewer_role=ctx.role,
        outcome="CLEARED" if outcome == "CLEARED" else "CONFIRMED",
        note=note,
    )
    return IntegritySignalDetail.model_validate(row)


# ---------------------------------------------------------------------------
# Organisations, suspension, seats
# ---------------------------------------------------------------------------
async def list_tenants(
    session: AsyncSession,
    *,
    tenant_type: str | None,
    status: str | None,
    name_contains: str | None,
    cursor: str | None,
    limit: int | None,
) -> TenantsPage:
    """Organisation names and states. Not a reveal -- no person is named --
    so not audited, and read on the app role: `tenants` is not under RLS."""
    size = clamp_limit(limit)
    after: tuple[str, uuid.UUID] | None = None
    if cursor is not None:
        payload = decode_cursor(cursor)
        try:
            after = (str(payload["n"]), uuid.UUID(str(payload["i"])))
        except (KeyError, ValueError) as exc:
            raise ValidationError(code="invalid_cursor") from exc
    rows = await identity_service.list_tenants(
        session,
        tenant_type=tenant_type,
        status=status,
        name_contains=name_contains,
        after=after,
        limit=size,
    )
    next_cursor = (
        encode_cursor({"n": rows[-1].name, "i": str(rows[-1].id)}) if len(rows) == size else None
    )
    return TenantsPage(
        items=[TenantRow.model_validate(row) for row in rows], next_cursor=next_cursor
    )


async def suspend_tenant(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    tenant_id: uuid.UUID,
    reason: str,
    request_id: str | None = None,
    now: datetime | None = None,
) -> SuspensionResponse:
    """Stop an employer or college operating, now. Deletes nothing.

    What stops: every member's next request (`tenant_suspended`), the
    organisation's jobs on the candidate board and applications to them, and
    -- for a college -- its students' seat-based access, because every check
    that reads `tenants.status` sees SUSPENDED (blockers E29). What does not:
    any row. Audited; the reason stays on the suspension row.
    """
    row = await identity_service.suspend_tenant(
        session,
        tenant_id=tenant_id,
        reason=reason.strip(),
        suspended_by=ctx.user_id,
        now=_now(now),
    )
    await audit_event(
        session,
        action=AuditAction.TENANT_SUSPENDED,
        actor_id=ctx.user_id,
        actor_role=ctx.role,
        target_type="tenant",
        target_id=tenant_id,
        tenant_id=tenant_id,
        request_id=request_id,
        metadata={"suspension_id": str(row.id)},
    )
    await emit(
        session,
        event_type=TENANT_SUSPENDED,
        aggregate_type="tenant",
        aggregate_id=tenant_id,
        payload={"tenant_id": str(tenant_id), "suspension_id": str(row.id)},
    )
    return SuspensionResponse.model_validate(row)


async def reinstate_tenant(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    tenant_id: uuid.UUID,
    request_id: str | None = None,
    now: datetime | None = None,
) -> SuspensionResponse:
    row = await identity_service.reinstate_tenant(
        session, tenant_id=tenant_id, lifted_by=ctx.user_id, now=_now(now)
    )
    await audit_event(
        session,
        action=AuditAction.TENANT_REINSTATED,
        actor_id=ctx.user_id,
        actor_role=ctx.role,
        target_type="tenant",
        target_id=tenant_id,
        tenant_id=tenant_id,
        request_id=request_id,
        metadata={"suspension_id": str(row.id)},
    )
    await emit(
        session,
        event_type=TENANT_REINSTATED,
        aggregate_type="tenant",
        aggregate_id=tenant_id,
        payload={"tenant_id": str(tenant_id), "suspension_id": str(row.id)},
    )
    return SuspensionResponse.model_validate(row)


async def suspensions(session: AsyncSession, *, tenant_id: uuid.UUID) -> list[SuspensionResponse]:
    await identity_service.get_tenant(session, tenant_id=tenant_id)
    rows = await identity_service.suspensions_for(session, tenant_id=tenant_id)
    return [SuspensionResponse.model_validate(row) for row in rows]


async def allocate_seats(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    tenant_id: uuid.UUID,
    seats: int,
    request_id: str | None = None,
) -> SeatAllocationResponse:
    """`college.service.allocate_seats` holds every rule and writes the audit
    row: capped by the live plan, never below the seats in use."""
    result = await college_service.allocate_seats(
        session,
        actor_id=ctx.user_id,
        actor_role=ctx.role,
        tenant_id=tenant_id,
        seats=seats,
        request_id=request_id,
    )
    return SeatAllocationResponse(
        allocated=result.allocated, used=result.used, filled=result.filled
    )


# ---------------------------------------------------------------------------
# Drill-downs
# ---------------------------------------------------------------------------
def _subscription(row: Any) -> SubscriptionSummary | None:
    if not row:
        return None
    return SubscriptionSummary(
        state=row["state"], plan_code=row["plan_code"], current_period_end=row["current_period_end"]
    )


def _suspension(row: Any) -> SuspensionSummary | None:
    return SuspensionSummary.model_validate(dict(row)) if row else None


async def candidate_drilldown(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    user_id: uuid.UUID,
    request_id: str | None = None,
) -> CandidateDrilldown:
    async with _reveal(
        session,
        ctx,
        action=AuditAction.ADMIN_CANDIDATE_DRILLDOWN,
        target_type="user",
        target_id=user_id,
        request_id=request_id,
    ) as reader:
        account = await repository.candidate_account(reader, user_id=user_id)
        if account is None:
            raise CandidateNotFoundError()
        facts = await repository.candidate_facts(reader, user_id=user_id)
        visible = await discovery_service.is_candidate_visible(reader, candidate_id=user_id)

    latest, resume = facts["latest_score"], facts["resume"]
    score = (
        ScoreSummary(
            display_value=display_value(int(latest["stored_value"])),
            band=band_for(display_value(int(latest["stored_value"]))),
            computed_at=latest["computed_at"],
            scores_computed=int(latest["history"]),
        )
        if latest
        else None
    )
    return CandidateDrilldown(
        id=account["id"],
        status=account["status"],
        locale=account["locale"],
        created_at=account["created_at"],
        full_name=account["full_name"],
        city=account["city"],
        state_code=account["state_code"],
        phone_masked=mask_phone(account["phone"]),
        email_masked=mask_email(account["email"]),
        score=score,
        resume=ResumeSummary(
            files=int(resume["files"]),
            versions=int(resume["versions"]),
            last_confirmed_at=resume["last_confirmed_at"],
        ),
        visible_to_employers=visible,
        integrity_signals=[
            SignalCount(severity=r["severity"], state=r["state"], count=int(r["n"]))
            for r in facts["signals"]
        ],
        applications_by_stage=facts["applications"],
        hire_disputes=facts["hire_disputes"],
        subscription=_subscription(facts["subscription"]),
        college_links=[CollegeLinkSummary.model_validate(dict(r)) for r in facts["colleges"]],
        seat_held=facts["seat_held"],
        disputes_by_state=facts["disputes"],
    )


async def employer_drilldown(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    tenant_id: uuid.UUID,
    request_id: str | None = None,
    now: datetime | None = None,
) -> EmployerDrilldown:
    now = _now(now)
    async with _reveal(
        session,
        ctx,
        action=AuditAction.ADMIN_EMPLOYER_DRILLDOWN,
        target_type="tenant",
        target_id=tenant_id,
        tenant_id=tenant_id,
        request_id=request_id,
    ) as reader:
        org = await repository.organisation(reader, tenant_id=tenant_id, tenant_type="EMPLOYER")
        if org is None:
            raise OrganisationNotFoundError()
        shared = await repository.organisation_facts(reader, tenant_id=tenant_id)
        facts = await repository.employer_facts(reader, tenant_id=tenant_id, now=now)

    views = facts["views"]
    return EmployerDrilldown(
        tenant_id=org["id"],
        name=org["name"],
        status=org["status"],
        created_at=org["created_at"],
        legal_name=org["legal_name"],
        employer_type=org["employer_type"],
        industry=org["industry"],
        kyb_status=org["kyb_status"],
        verified_at=org["verified_at"],
        latest_kyb=KybSummary.model_validate(dict(facts["latest_kyb"]))
        if facts["latest_kyb"]
        else None,
        members_by_role=shared["members"],
        jobs_by_status=facts["jobs"],
        applications_by_stage=facts["applications"],
        subscription=_subscription(shared["subscription"]),
        suspension=_suspension(shared["suspension"]),
        candidates_viewed_last_day=int(views["last_day"]) if views else 0,
        candidates_viewed_last_30_days=int(views["last_30_days"]) if views else 0,
        view_anomaly_flags_last_30_days=facts["anomaly_flags_30_days"],
        disputes_by_state=shared["disputes"],
    )


async def college_drilldown(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    tenant_id: uuid.UUID,
    request_id: str | None = None,
    now: datetime | None = None,
) -> CollegeDrilldown:
    """Counts only. Which students are linked is the college's to see under
    INDIVIDUAL consent (invariant 9), and a member of staff opens a named
    student through the candidate drill-down, which is audited separately."""
    now = _now(now)
    async with _reveal(
        session,
        ctx,
        action=AuditAction.ADMIN_COLLEGE_DRILLDOWN,
        target_type="tenant",
        target_id=tenant_id,
        tenant_id=tenant_id,
        request_id=request_id,
    ) as reader:
        org = await repository.organisation(reader, tenant_id=tenant_id, tenant_type="COLLEGE")
        if org is None:
            raise OrganisationNotFoundError()
        shared = await repository.organisation_facts(reader, tenant_id=tenant_id)
        facts = await repository.college_facts(reader, tenant_id=tenant_id, now=now)

    seats, subscription = facts["seats"], shared["subscription"]
    return CollegeDrilldown(
        tenant_id=org["id"],
        name=org["college_name"] or org["name"],
        status=org["status"],
        created_at=org["created_at"],
        institution_type=org["institution_type"],
        onboarding_submitted_at=org["onboarding_submitted_at"],
        verified_at=org["verified_at"],
        members_by_role=shared["members"],
        seats=SeatSummary(
            allocated=int(seats["seats_allocated"]),
            used=int(seats["seats_used"]),
            plan_allowance=subscription["seat_allowance"] if subscription else None,
        )
        if seats
        else None,
        live_referral_codes=facts["live_codes"],
        connected_students=facts["consents"].get("ROSTER", 0),
        individually_visible=facts["consents"].get("INDIVIDUAL", 0),
        roster_imports_by_state=facts["roster_imports"],
        invitations_by_state=facts["invitations"],
        subscription=_subscription(subscription),
        suspension=_suspension(shared["suspension"]),
        disputes_by_state=shared["disputes"],
    )


# ---------------------------------------------------------------------------
# Disputes -- the console
# ---------------------------------------------------------------------------
async def dispute_queue(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    state: str | None,
    kind: str | None,
    party: str | None,
    cursor: str | None,
    limit: int | None,
) -> DisputesPage:
    """Open and in-review disputes by default, oldest first, across all three
    groups. Rows carry identifiers; the description is read by opening one."""
    await _bind_platform(session, ctx)
    size = clamp_limit(limit)
    states = (
        (state,) if state else tuple(s for s in DISPUTE_STATES if s not in CLOSED_DISPUTE_STATES)
    )
    rows = await repository.dispute_queue(
        session, states=states, kind=kind, party=party, after=_keyset(cursor), limit=size
    )
    next_cursor = (
        encode_cursor({"t": rows[-1].created_at.isoformat(), "i": str(rows[-1].id)})
        if len(rows) == size
        else None
    )
    return DisputesPage(
        items=[DisputeRow.model_validate(row) for row in rows], next_cursor=next_cursor
    )


async def _staff_dispute(
    session: AsyncSession, ctx: TenantContext, dispute_id: uuid.UUID, *, lock: bool = False
) -> Dispute:
    await _bind_platform(session, ctx)
    row = await repository.get_dispute(session, dispute_id=dispute_id, lock=lock)
    if row is None:
        raise DisputeNotFoundError()
    return row


async def _detail(row: Dispute) -> DisputeDetail:
    """The row plus its cross-links, read on the bypass session. The caller
    has already audited the open."""
    async with get_admin_session_factory()() as reader, reader.begin():
        await reader.execute(text("SET TRANSACTION READ ONLY"))
        links = await repository.dispute_links(
            reader,
            application_id=row.application_id,
            candidate_id=row.raised_by if row.party == "CANDIDATE" else None,
        )
    application = links["application"]
    return DisputeDetail(
        **DisputeRow.model_validate(row).model_dump(),
        description=row.description,
        resolution=row.resolution,
        resolved_by=row.resolved_by,
        links=DisputeLinks(
            candidate_id=links["candidate_id"],
            raiser_tenant_id=row.tenant_id,
            application=ApplicationLink(
                id=application["id"],
                candidate_id=application["candidate_id"],
                employer_tenant_id=application["tenant_id"],
                job_id=application["job_id"],
                stage=application["stage"],
                employer_confirmed_at=application["employer_confirmed_at"],
                candidate_confirmed_at=application["candidate_confirmed_at"],
                hire_disputed_at=application["hire_disputed_at"],
            )
            if application
            else None,
            live_integrity_signals=links["signals"],
        ),
    )


async def open_dispute(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    dispute_id: uuid.UUID,
    request_id: str | None = None,
) -> DisputeDetail:
    row = await _staff_dispute(session, ctx, dispute_id)
    await audit_event(
        session,
        action=AuditAction.ADMIN_DISPUTE_OPENED,
        actor_id=ctx.user_id,
        actor_role=ctx.role,
        target_type="dispute",
        target_id=row.id,
        tenant_id=row.tenant_id,
        request_id=request_id,
    )
    await session.flush()
    return await _detail(row)


async def assign_dispute(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    dispute_id: uuid.UUID,
    request_id: str | None = None,
) -> DisputeDetail:
    """Take it: the caller becomes the assignee and the dispute is IN_REVIEW.
    Taking one somebody else holds is allowed and audited -- people go on
    leave, and a queue that cannot be reassigned stalls."""
    row = await _staff_dispute(session, ctx, dispute_id, lock=True)
    if row.state != "IN_REVIEW":
        refusal = dispute_transition_refusal(row.state, "IN_REVIEW")
        if refusal is not None:
            raise DisputeStateError(code=refusal, params={"state": row.state})
    previous = row.assigned_to
    row = await repository.update_dispute(
        session, dispute_id=row.id, state="IN_REVIEW", assigned_to=ctx.user_id
    )
    await audit_event(
        session,
        action=AuditAction.DISPUTE_ASSIGNED,
        actor_id=ctx.user_id,
        actor_role=ctx.role,
        target_type="dispute",
        target_id=row.id,
        tenant_id=row.tenant_id,
        request_id=request_id,
        metadata={"previous_assignee": str(previous) if previous else None},
    )
    return await _detail(row)


async def resolve_dispute(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    dispute_id: uuid.UUID,
    outcome: str,
    resolution: str,
    request_id: str | None = None,
    now: datetime | None = None,
) -> DisputeDetail:
    """Close it with words the raiser will read. **Changes nothing else**: a
    resolved hire dispute does not move the application, and a resolved
    payment dispute refunds nothing (blockers E12, E18). What follows from the
    decision is taken where that rule lives, by someone entitled to take it."""
    row = await _staff_dispute(session, ctx, dispute_id, lock=True)
    refusal = dispute_transition_refusal(row.state, outcome)
    if refusal is not None:
        raise DisputeStateError(code=refusal, params={"state": row.state})
    row = await repository.update_dispute(
        session,
        dispute_id=row.id,
        state=outcome,
        resolution=resolution.strip(),
        resolved_by=ctx.user_id,
        resolved_at=_now(now),
        assigned_to=row.assigned_to or ctx.user_id,
    )
    await audit_event(
        session,
        action=AuditAction.DISPUTE_RESOLVED,
        actor_id=ctx.user_id,
        actor_role=ctx.role,
        target_type="dispute",
        target_id=row.id,
        tenant_id=row.tenant_id,
        request_id=request_id,
        metadata={"outcome": outcome, "kind": row.kind, "party": row.party},
    )
    await emit(
        session,
        event_type=DISPUTE_CLOSED,
        aggregate_type="dispute",
        aggregate_id=row.id,
        payload={
            "dispute_id": str(row.id),
            "raised_by": str(row.raised_by),
            "outcome": outcome,
        },
    )
    return await _detail(row)


# ---------------------------------------------------------------------------
# Audit search
# ---------------------------------------------------------------------------
async def search_audit(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    actor_id: uuid.UUID | None,
    action: str | None,
    target_type: str | None,
    target_id: str | None,
    tenant_id: uuid.UUID | None,
    occurred_from: datetime | None,
    occurred_to: datetime | None,
    cursor: str | None,
    limit: int | None,
    request_id: str | None = None,
) -> AuditEventsPage:
    """SRS 2.25.4: by actor, action, target and time, server-paginated. The
    search itself is written to the trail before it runs, with its filters."""
    if action is not None and action not in {a.value for a in AuditAction}:
        raise ValidationError(code="audit_action_unknown", params={"action": action})
    if occurred_from and occurred_to and occurred_from >= occurred_to:
        raise ValidationError(code="audit_time_range_invalid")
    size = clamp_limit(limit)
    filters = {
        "actor_id": str(actor_id) if actor_id else None,
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "tenant_id": str(tenant_id) if tenant_id else None,
        "occurred_from": occurred_from.isoformat() if occurred_from else None,
        "occurred_to": occurred_to.isoformat() if occurred_to else None,
    }
    async with _reveal(
        session,
        ctx,
        action=AuditAction.ADMIN_AUDIT_LOG_SEARCHED,
        target_type="audit_events",
        target_id=None,
        request_id=request_id,
        metadata={k: v for k, v in filters.items() if v is not None},
    ) as reader:
        rows = await repository.audit_events(
            reader,
            actor_id=actor_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            tenant_id=tenant_id,
            occurred_from=occurred_from,
            occurred_to=occurred_to,
            after=_keyset(cursor, id_type=int),
            limit=size,
        )
    return AuditEventsPage(
        items=[AuditEventRow.model_validate(dict(r)) for r in rows],
        next_cursor=_next(rows, size, at="occurred_at"),
    )


# ---------------------------------------------------------------------------
# Disputes -- the raiser's side
# ---------------------------------------------------------------------------
async def _bind_raiser(session: AsyncSession, ctx: TenantContext) -> str:
    party = party_for_role(ctx.role)
    if party is None:
        raise PermissionDeniedError()
    if party == "CANDIDATE":
        await jobs_service.bind_candidate(session, ctx)
    else:
        if ctx.tenant_id is None:
            raise PermissionDeniedError()
        await set_transaction_tenant(session, ctx.tenant_id)
    return party


async def raise_dispute(
    session: AsyncSession,
    *,
    ctx: TenantContext,
    kind: str,
    application_id: uuid.UUID | None,
    description: str,
) -> MyDisputeResponse:
    """A candidate, an employer or a college tells us something went wrong.

    Rate-limited per person. A HIRE dispute must name an application the
    caller can see, checked under their own row-level security here and again
    by `guard_dispute_write`; any other id is `dispute_application_not_found`,
    whether it exists or not.
    """
    party = await _bind_raiser(session, ctx)
    refusal = dispute_refusal(party=party, kind=kind, has_application=application_id is not None)
    if refusal is not None:
        raise DisputeRefusedError(code=refusal, params={"kind": kind})
    await hit(
        bucket="dispute_raise",
        subject=str(ctx.user_id),
        limit=DISPUTES_PER_DAY,
        window_seconds=86_400,
    )
    if application_id is not None and not await repository.application_visible(
        session, application_id=application_id
    ):
        raise DisputeApplicationNotFoundError()

    row = await repository.insert_dispute(
        session,
        kind=kind,
        party=party,
        source="RAISED",
        raised_by=ctx.user_id,
        tenant_id=None if party == "CANDIDATE" else ctx.tenant_id,
        application_id=application_id,
        description=description.strip(),
        state="OPEN",
    )
    assert row is not None  # only a HIRE_DISPUTE source can conflict
    await _emit_opened(session, row)
    return MyDisputeResponse.model_validate(row)


async def my_disputes(session: AsyncSession, *, ctx: TenantContext) -> list[MyDisputeResponse]:
    """A candidate's own; an organisation's, whoever in it raised them."""
    await _bind_raiser(session, ctx)
    rows = await repository.visible_disputes(session, limit=100)
    return [MyDisputeResponse.model_validate(row) for row in rows]


async def open_hire_dispute(
    session: AsyncSession, *, application_id: uuid.UUID, candidate_id: uuid.UUID
) -> uuid.UUID | None:
    """Put a disputed hire in the queue, as the candidate's dispute (system).

    Day 12 recorded `hire_disputed_at` and nobody read it (blockers E12). This
    runs on `applications.hire_disputed` and files it **as the candidate**,
    binding their identity exactly as their own request did, so the row passes
    the same policy and guard a raised dispute does. At least once, so
    idempotent by application (`uq_disputes_hire_dispute`). None when it was
    already open.
    """
    await set_transaction_user(session, candidate_id)
    row = await repository.insert_dispute(
        session,
        kind="HIRE",
        party="CANDIDATE",
        source="HIRE_DISPUTE",
        raised_by=candidate_id,
        tenant_id=None,
        application_id=application_id,
        description=HIRE_DISPUTE_DESCRIPTION,
        state="OPEN",
    )
    if row is None:
        return None
    await _emit_opened(session, row)
    return row.id


async def _emit_opened(session: AsyncSession, row: Dispute) -> None:
    await emit(
        session,
        event_type=DISPUTE_OPENED,
        aggregate_type="dispute",
        aggregate_id=row.id,
        payload={"dispute_id": str(row.id), "kind": row.kind, "party": row.party},
    )
