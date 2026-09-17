"""admin - HTTP layer

Queues, drill-downs, disputes, suspensions.

Routes only. No business logic, no repository access.
import-linter enforces the second half of that sentence.

**Two surfaces.** `router` is the console (`/admin`), for our own staff, who
belong to the PLATFORM tenant. `raiser_router` is `/disputes`, where a
candidate, an employer or a college raises a dispute and reads the answer.

**Every console route names its capability** from `domain.CONSOLE_ROLES`, so
the permission table is the one place to read who may do what, and
`tests/invariants/test_admin_console.py` holds it: no external role reaches
any `/admin` route, and every drill-down writes an audit row.

**No payment gate here.** The console is ours; a dispute about a payment must
not require one.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, Query, Request, status

from app.core.deps import CurrentUser, DbSession, get_request_id, require_role
from app.modules.admin import service
from app.modules.admin.domain import CONSOLE_ROLES, DISPUTE_RAISER_ROLES, Capability
from app.modules.admin.schemas import (
    AllocateSeatsRequest,
    AuditEventsPage,
    CandidateDrilldown,
    CollegeDrilldown,
    DisputeDetail,
    DisputesPage,
    EmployerDrilldown,
    IntegritySignalDetail,
    IntegritySignalsPage,
    KybDecisionRequest,
    KybSubmissionsPage,
    MyDisputeResponse,
    RaiseDisputeRequest,
    ResolveDisputeRequest,
    ResolveSignalRequest,
    SeatAllocationResponse,
    SuspendTenantRequest,
    SuspensionResponse,
    TenantsPage,
)
from app.modules.kyb.schemas import KybSubmissionResponse
from app.modules.notifications import service as notifications_service
from app.modules.notifications.schemas import SuppressRequest, SuppressResponse

router = APIRouter()
raiser_router = APIRouter()


def can(capability: Capability) -> list[Any]:
    return [Depends(require_role(*sorted(CONSOLE_ROLES[capability])))]


Limit = Query(default=None, ge=1, le=100)


# ---------------------------------------------------------------------------
# KYB
# ---------------------------------------------------------------------------
@router.get(
    "/kyb/submissions",
    response_model=KybSubmissionsPage,
    dependencies=can("kyb"),
    summary="Every KYB submission, newest first",
)
async def list_kyb_submissions(
    request: Request,
    user: CurrentUser,
    session: DbSession,
    state: str | None = None,
    cursor: str | None = None,
    limit: int | None = Limit,
) -> KybSubmissionsPage:
    """While `review_required` is false this is a record, not a queue: every
    submission was approved on arrival (R15)."""
    return await service.kyb_submissions(
        session,
        ctx=user,
        state=state,
        cursor=cursor,
        limit=limit,
        request_id=get_request_id(request),
    )


@router.get(
    "/kyb/submissions/{submission_id}",
    response_model=KybSubmissionResponse,
    dependencies=can("kyb"),
    summary="One submission with its answers and documents (audited)",
)
async def open_kyb_submission(
    submission_id: uuid.UUID, request: Request, user: CurrentUser, session: DbSession
) -> KybSubmissionResponse:
    return await service.open_kyb_submission(
        session, ctx=user, submission_id=submission_id, request_id=get_request_id(request)
    )


@router.post(
    "/kyb/submissions/{submission_id}/decision",
    response_model=KybSubmissionResponse,
    dependencies=can("kyb"),
    summary="Record a KYB decision",
)
async def decide_kyb(
    submission_id: uuid.UUID,
    payload: KybDecisionRequest,
    request: Request,
    user: CurrentUser,
    session: DbSession,
) -> KybSubmissionResponse:
    """Rejecting or asking for more information needs a reason, which the
    organisation reads. Only a submission awaiting review can be decided."""
    return await service.decide_kyb(
        session,
        ctx=user,
        submission_id=submission_id,
        decision=payload.decision,
        reason=payload.reason,
        request_id=get_request_id(request),
    )


# ---------------------------------------------------------------------------
# Integrity
# ---------------------------------------------------------------------------
@router.get(
    "/integrity/signals",
    response_model=IntegritySignalsPage,
    dependencies=can("integrity"),
    summary="The integrity review queue, oldest first",
)
async def integrity_queue(
    request: Request,
    user: CurrentUser,
    session: DbSession,
    state: Literal["OPEN", "CLEARED", "CONFIRMED"] = "OPEN",
    severity: Literal["LOW", "MEDIUM", "HIGH"] | None = None,
    cursor: str | None = None,
    limit: int | None = Limit,
) -> IntegritySignalsPage:
    return await service.integrity_queue(
        session,
        ctx=user,
        state=state,
        severity=severity,
        cursor=cursor,
        limit=limit,
        request_id=get_request_id(request),
    )


@router.get(
    "/integrity/signals/{signal_id}",
    response_model=IntegritySignalDetail,
    dependencies=can("integrity"),
    summary="One signal with its evidence (audited)",
)
async def open_signal(
    signal_id: uuid.UUID, request: Request, user: CurrentUser, session: DbSession
) -> IntegritySignalDetail:
    return await service.open_signal(
        session, ctx=user, signal_id=signal_id, request_id=get_request_id(request)
    )


@router.post(
    "/integrity/signals/{signal_id}/resolve",
    response_model=IntegritySignalDetail,
    dependencies=can("integrity"),
    summary="Clear or confirm a signal",
)
async def resolve_signal(
    signal_id: uuid.UUID, payload: ResolveSignalRequest, user: CurrentUser, session: DbSession
) -> IntegritySignalDetail:
    """CLEARED returns a HIGH-flagged candidate to employer search; CONFIRMED
    keeps them out. Neither moves a score (SRS 1.4.5). A decision is final."""
    return await service.resolve_signal(
        session, ctx=user, signal_id=signal_id, outcome=payload.outcome, note=payload.note
    )


# ---------------------------------------------------------------------------
# Organisations, suspension, seats
# ---------------------------------------------------------------------------
@router.get(
    "/tenants",
    response_model=TenantsPage,
    dependencies=can("tenants"),
    summary="Employers and colleges by name",
)
async def list_tenants(
    session: DbSession,
    tenant_type: Literal["EMPLOYER", "COLLEGE"] | None = Query(default=None, alias="type"),
    status_filter: Literal["ACTIVE", "SUSPENDED", "CLOSED"] | None = Query(
        default=None, alias="status"
    ),
    q: str | None = Query(default=None, max_length=100),
    cursor: str | None = None,
    limit: int | None = Limit,
) -> TenantsPage:
    return await service.list_tenants(
        session,
        tenant_type=tenant_type,
        status=status_filter,
        name_contains=q,
        cursor=cursor,
        limit=limit,
    )


@router.post(
    "/tenants/{tenant_id}/suspend",
    response_model=SuspensionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=can("suspend"),
    summary="Stop an organisation operating, immediately",
)
async def suspend_tenant(
    tenant_id: uuid.UUID,
    payload: SuspendTenantRequest,
    request: Request,
    user: CurrentUser,
    session: DbSession,
) -> SuspensionResponse:
    """Every member is refused on their next request, the organisation's jobs
    leave the board, and nothing is deleted. 409 if already suspended."""
    return await service.suspend_tenant(
        session,
        ctx=user,
        tenant_id=tenant_id,
        reason=payload.reason,
        request_id=get_request_id(request),
    )


@router.post(
    "/tenants/{tenant_id}/reinstate",
    response_model=SuspensionResponse,
    dependencies=can("suspend"),
    summary="Lift an organisation's suspension",
)
async def reinstate_tenant(
    tenant_id: uuid.UUID, request: Request, user: CurrentUser, session: DbSession
) -> SuspensionResponse:
    return await service.reinstate_tenant(
        session, ctx=user, tenant_id=tenant_id, request_id=get_request_id(request)
    )


@router.get(
    "/tenants/{tenant_id}/suspensions",
    response_model=list[SuspensionResponse],
    dependencies=can("tenants"),
    summary="An organisation's suspension history, newest first",
)
async def suspension_history(tenant_id: uuid.UUID, session: DbSession) -> list[SuspensionResponse]:
    return await service.suspensions(session, tenant_id=tenant_id)


@router.put(
    "/colleges/{tenant_id}/seats",
    response_model=SeatAllocationResponse,
    dependencies=can("seats"),
    summary="Set a college's seat allowance",
)
async def allocate_seats(
    tenant_id: uuid.UUID,
    payload: AllocateSeatsRequest,
    request: Request,
    user: CurrentUser,
    session: DbSession,
) -> SeatAllocationResponse:
    """Never below the seats in use, never above what the college's live plan
    pays for. Growing it seats linked students waiting for one."""
    return await service.allocate_seats(
        session,
        ctx=user,
        tenant_id=tenant_id,
        seats=payload.seats,
        request_id=get_request_id(request),
    )


# ---------------------------------------------------------------------------
# Drill-downs
# ---------------------------------------------------------------------------
@router.get(
    "/candidates/{user_id}",
    response_model=CandidateDrilldown,
    dependencies=can("candidate_drilldown"),
    summary="One candidate across every module (audited)",
)
async def candidate_drilldown(
    user_id: uuid.UUID, request: Request, user: CurrentUser, session: DbSession
) -> CandidateDrilldown:
    return await service.candidate_drilldown(
        session, ctx=user, user_id=user_id, request_id=get_request_id(request)
    )


@router.get(
    "/employers/{tenant_id}",
    response_model=EmployerDrilldown,
    dependencies=can("employer_drilldown"),
    summary="One employer across every module (audited)",
)
async def employer_drilldown(
    tenant_id: uuid.UUID, request: Request, user: CurrentUser, session: DbSession
) -> EmployerDrilldown:
    return await service.employer_drilldown(
        session, ctx=user, tenant_id=tenant_id, request_id=get_request_id(request)
    )


@router.get(
    "/colleges/{tenant_id}",
    response_model=CollegeDrilldown,
    dependencies=can("college_drilldown"),
    summary="One college across every module (audited)",
)
async def college_drilldown(
    tenant_id: uuid.UUID, request: Request, user: CurrentUser, session: DbSession
) -> CollegeDrilldown:
    return await service.college_drilldown(
        session, ctx=user, tenant_id=tenant_id, request_id=get_request_id(request)
    )


@router.post(
    "/users/{user_id}/notification-suppressions",
    response_model=SuppressResponse,
    dependencies=can("suppress_notifications"),
    summary="Stop messages to one account on a channel (audited)",
)
async def suppress_notifications(
    user_id: uuid.UUID,
    payload: SuppressRequest,
    request: Request,
    user: CurrentUser,
    session: DbSession,
) -> SuppressResponse:
    """Our stop, recorded apart from the person's own preferences. The in-app
    inbox is never suppressed."""
    return await notifications_service.suppress(
        session,
        ctx=user,
        user_id=user_id,
        channel=payload.channel,
        reason=payload.reason,
        request_id=get_request_id(request),
    )


# ---------------------------------------------------------------------------
# Disputes
# ---------------------------------------------------------------------------
@router.get(
    "/disputes",
    response_model=DisputesPage,
    dependencies=can("disputes"),
    summary="The dispute queue across candidates, employers and colleges",
)
async def dispute_queue(
    user: CurrentUser,
    session: DbSession,
    state: Literal["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"] | None = None,
    kind: Literal["HIRE", "PAYMENT", "ACCOUNT", "OTHER"] | None = None,
    party: Literal["CANDIDATE", "EMPLOYER", "COLLEGE"] | None = None,
    cursor: str | None = None,
    limit: int | None = Limit,
) -> DisputesPage:
    """Without `state`, what still needs someone: OPEN and IN_REVIEW."""
    return await service.dispute_queue(
        session, ctx=user, state=state, kind=kind, party=party, cursor=cursor, limit=limit
    )


@router.get(
    "/disputes/{dispute_id}",
    response_model=DisputeDetail,
    dependencies=can("disputes"),
    summary="One dispute, cross-linked to its people and records (audited)",
)
async def open_dispute(
    dispute_id: uuid.UUID, request: Request, user: CurrentUser, session: DbSession
) -> DisputeDetail:
    return await service.open_dispute(
        session, ctx=user, dispute_id=dispute_id, request_id=get_request_id(request)
    )


@router.post(
    "/disputes/{dispute_id}/assign",
    response_model=DisputeDetail,
    dependencies=can("disputes"),
    summary="Take a dispute",
)
async def assign_dispute(
    dispute_id: uuid.UUID, request: Request, user: CurrentUser, session: DbSession
) -> DisputeDetail:
    return await service.assign_dispute(
        session, ctx=user, dispute_id=dispute_id, request_id=get_request_id(request)
    )


@router.post(
    "/disputes/{dispute_id}/resolve",
    response_model=DisputeDetail,
    dependencies=can("disputes"),
    summary="Close a dispute with an answer for the raiser",
)
async def resolve_dispute(
    dispute_id: uuid.UUID,
    payload: ResolveDisputeRequest,
    request: Request,
    user: CurrentUser,
    session: DbSession,
) -> DisputeDetail:
    """Records the answer and nothing else: no application moves and no
    payment is refunded by closing a dispute."""
    return await service.resolve_dispute(
        session,
        ctx=user,
        dispute_id=dispute_id,
        outcome=payload.outcome,
        resolution=payload.resolution,
        request_id=get_request_id(request),
    )


# ---------------------------------------------------------------------------
# Audit search
# ---------------------------------------------------------------------------
@router.get(
    "/audit-events",
    response_model=AuditEventsPage,
    dependencies=can("audit_search"),
    summary="Search the audit trail by actor, action, target and time",
)
async def search_audit(
    request: Request,
    user: CurrentUser,
    session: DbSession,
    actor_id: uuid.UUID | None = None,
    action: str | None = Query(default=None, max_length=64),
    target_type: str | None = Query(default=None, max_length=64),
    target_id: str | None = Query(default=None, max_length=64),
    tenant_id: uuid.UUID | None = None,
    occurred_from: datetime | None = Query(default=None, alias="from"),
    occurred_to: datetime | None = Query(default=None, alias="to"),
    cursor: str | None = None,
    limit: int | None = Limit,
) -> AuditEventsPage:
    """Newest first. `from` is inclusive, `to` exclusive. The search is itself
    written to the trail, with its filters."""
    return await service.search_audit(
        session,
        ctx=user,
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        tenant_id=tenant_id,
        occurred_from=occurred_from,
        occurred_to=occurred_to,
        cursor=cursor,
        limit=limit,
        request_id=get_request_id(request),
    )


# ---------------------------------------------------------------------------
# /disputes -- raised by candidates, employers and colleges
# ---------------------------------------------------------------------------
Raisers = [Depends(require_role(*sorted(DISPUTE_RAISER_ROLES)))]


@raiser_router.post(
    "",
    response_model=MyDisputeResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=Raisers,
    summary="Raise a dispute",
)
async def raise_dispute(
    payload: RaiseDisputeRequest, user: CurrentUser, session: DbSession
) -> MyDisputeResponse:
    """HIRE needs the application it is about; PAYMENT, ACCOUNT and OTHER take
    none. A college cannot dispute a hire. Five a day per person."""
    return await service.raise_dispute(
        session,
        ctx=user,
        kind=payload.kind,
        application_id=payload.application_id,
        description=payload.description,
    )


@raiser_router.get(
    "",
    response_model=list[MyDisputeResponse],
    dependencies=Raisers,
    summary="Disputes raised by me, or by my organisation",
)
async def my_disputes(user: CurrentUser, session: DbSession) -> list[MyDisputeResponse]:
    return await service.my_disputes(session, ctx=user)
