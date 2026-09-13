"""employer - business rules and transaction boundaries

Employer tenant, team members, roles.

Services own the transaction. They never touch `Request`, and anything that
reveals private data writes its audit row on the same session before the
transaction closes.

**The tenant is always the caller's resolved membership.** Every function that
touches tenant data takes a `TenantContext` and binds `app.tenant_id` from it
before the first read. A tenant id from a path, a body or a header never
reaches this module, which is what SRS 2.24.7 requires and what makes the
Row-Level Security policy on `employers` meaningful.

Tenants and memberships belong to `identity`, so team management delegates to
`identity.service`. This module adds what is employer-specific: the profile,
the vocabularies, and the audit trail of who changed a team.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditAction, audit_event
from app.core.db import set_transaction_tenant
from app.core.errors import NotFoundError, PermissionDeniedError
from app.core.logging import get_logger
from app.core.outbox import emit
from app.core.tenant import TenantContext
from app.modules.employer import repository
from app.modules.employer.events import MODULE
from app.modules.employer.schemas import (
    AddTeamMemberRequest,
    ChangeRoleRequest,
    CreateOrganisationRequest,
    UpdateOrganisationRequest,
)
from app.modules.identity import service as identity_service

logger = get_logger(__name__)


class OrganisationNotFoundError(NotFoundError):
    code = "employer_organisation_not_found"
    title = "Organisation not found"


def _tenant_of(ctx: TenantContext) -> uuid.UUID:
    """`current_user` already guarantees an employer role carries a tenant.
    This makes the guarantee local, so a route wired with the wrong guard
    fails here rather than binding a null tenant and reading nothing."""
    if ctx.tenant_id is None:
        raise PermissionDeniedError()
    return ctx.tenant_id


async def _bind(session: AsyncSession, ctx: TenantContext) -> uuid.UUID:
    tenant_id = _tenant_of(ctx)
    await set_transaction_tenant(session, tenant_id)
    return tenant_id


# ---------------------------------------------------------------------------
# The organisation
# ---------------------------------------------------------------------------
async def create_organisation(
    session: AsyncSession, *, user_id: uuid.UUID, payload: CreateOrganisationRequest
) -> Any:
    """A business account creates its organisation and becomes its owner.

    The tenant is created first, then `app.tenant_id` is bound to it, and only
    then is the `employers` row written: the RLS policy's `WITH CHECK` refuses
    an insert whose `tenant_id` does not match the bound tenant, so the order
    is not stylistic.

    KYB starts at DRAFT. The organisation exists before it is verified;
    publishing a job does not (invariant 8, Day 10).
    """
    tenant_id = await identity_service.create_tenant_with_owner(
        session,
        owner_user_id=user_id,
        tenant_type="EMPLOYER",
        name=payload.legal_name,
        owner_role=identity_service.EMPLOYER_OWNER_ROLE,
    )
    await set_transaction_tenant(session, tenant_id)

    row = await repository.create_employer(
        session,
        tenant_id=tenant_id,
        legal_name=payload.legal_name,
        employer_type=payload.employer_type,
        industry=payload.industry,
    )
    await audit_event(
        session,
        action=AuditAction.ORGANISATION_CREATED,
        actor_id=user_id,
        actor_role=identity_service.EMPLOYER_OWNER_ROLE,
        target_type="tenant",
        target_id=tenant_id,
        tenant_id=tenant_id,
    )
    await emit(
        session,
        event_type=f"{MODULE}.organisation_created",
        aggregate_type="tenant",
        aggregate_id=tenant_id,
        payload={"owner_user_id": str(user_id)},
    )
    logger.info("organisation_created", tenant_id=str(tenant_id))
    return row


async def get_organisation(session: AsyncSession, *, ctx: TenantContext) -> Any:
    tenant_id = await _bind(session, ctx)
    row = await repository.get_employer(session, tenant_id=tenant_id)
    if row is None:
        raise OrganisationNotFoundError()
    return row


async def update_organisation(
    session: AsyncSession, *, ctx: TenantContext, payload: UpdateOrganisationRequest
) -> Any:
    tenant_id = await _bind(session, ctx)
    changes: dict[str, str | None] = payload.model_dump(exclude_unset=True)
    row = await repository.update_employer(session, tenant_id=tenant_id, changes=changes)
    if row is None:
        raise OrganisationNotFoundError()
    if "legal_name" in changes and changes["legal_name"] is not None:
        # `tenants.name` is what admin screens and the suspension log show.
        # Letting it drift from the legal name is how an admin suspends the
        # wrong company.
        await identity_service.rename_tenant(
            session, tenant_id=tenant_id, name=changes["legal_name"]
        )
    await emit(
        session,
        event_type=f"{MODULE}.organisation_updated",
        aggregate_type="tenant",
        aggregate_id=tenant_id,
        payload={"fields": sorted(changes)},
    )
    return row


# ---------------------------------------------------------------------------
# The team. Every change is audited: who can see candidate data is itself
# privileged information, and "who gave this recruiter access?" is the first
# question after a leak.
# ---------------------------------------------------------------------------
async def list_team(session: AsyncSession, *, ctx: TenantContext) -> Any:
    return await identity_service.list_team(session, tenant_id=_tenant_of(ctx))


async def add_team_member(
    session: AsyncSession, *, ctx: TenantContext, payload: AddTeamMemberRequest
) -> Any:
    tenant_id = await _bind(session, ctx)
    member = await identity_service.add_team_member(
        session, tenant_id=tenant_id, email=payload.email, role=payload.role
    )
    # The role, not the address. Audit metadata must not carry PII; the
    # target id resolves to the person for anyone entitled to look.
    await audit_event(
        session,
        action=AuditAction.TEAM_MEMBER_ADDED,
        actor_id=ctx.user_id,
        actor_role=ctx.role,
        target_type="user",
        target_id=member.user_id,
        tenant_id=tenant_id,
        metadata={"role": payload.role},
    )
    return member


async def change_member_role(
    session: AsyncSession, *, ctx: TenantContext, user_id: uuid.UUID, payload: ChangeRoleRequest
) -> Any:
    tenant_id = await _bind(session, ctx)
    member = await identity_service.change_member_role(
        session, tenant_id=tenant_id, user_id=user_id, role=payload.role
    )
    await audit_event(
        session,
        action=AuditAction.TEAM_MEMBER_ROLE_CHANGED,
        actor_id=ctx.user_id,
        actor_role=ctx.role,
        target_type="user",
        target_id=user_id,
        tenant_id=tenant_id,
        metadata={"role": payload.role},
    )
    return member


async def remove_team_member(
    session: AsyncSession, *, ctx: TenantContext, user_id: uuid.UUID
) -> None:
    tenant_id = await _bind(session, ctx)
    await identity_service.remove_team_member(session, tenant_id=tenant_id, user_id=user_id)
    await audit_event(
        session,
        action=AuditAction.TEAM_MEMBER_REMOVED,
        actor_id=ctx.user_id,
        actor_role=ctx.role,
        target_type="user",
        target_id=user_id,
        tenant_id=tenant_id,
    )
