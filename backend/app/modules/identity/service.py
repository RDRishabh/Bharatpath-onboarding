"""identity - business rules and transaction boundaries

Users, sessions, Cognito linkage, memberships.

Services own the transaction. They never touch `Request`, and anything that
reveals private data writes its audit row on the same session before the
transaction closes.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import membership as membership_lookup
from app.core.errors import ConflictError, NotFoundError
from app.core.logging import get_logger
from app.core.ratelimit import hit
from app.modules.identity import repository
from app.settings import get_settings

logger = get_logger(__name__)

OTP_WINDOW_SECONDS = 3600


async def start_otp_challenge(*, phone: str, client_ip: str | None) -> int:
    """Throttle an OTP request, then let the client proceed to Cognito.

    **Two counters, not one, and both are needed.** Per-phone stops someone
    hammering one victim's number into a flood of login texts. Per-IP stops
    someone walking the number space -- which the per-phone limit alone would
    happily allow, five messages at a time, across every number in India.

    This service does not call Twilio and does not send anything. The client
    goes to Cognito next; Cognito's custom-auth Lambdas call Twilio Verify.
    We are the outer throttle in front of that, and nothing else
    (docs/plan.md 5.8).

    Returns the window length, so the client can render a resend timer that
    matches the server's actual behaviour rather than guessing.
    """
    settings = get_settings()

    await hit(
        bucket="otp:phone",
        subject=phone,
        limit=settings.otp_start_per_phone_per_hour,
        window_seconds=OTP_WINDOW_SECONDS,
    )
    if client_ip:
        await hit(
            bucket="otp:ip",
            subject=client_ip,
            limit=settings.otp_start_per_ip_per_hour,
            window_seconds=OTP_WINDOW_SECONDS,
        )

    # Logged without the number. A phone number in an application log is
    # personal data sitting in a system with far broader access than the
    # database, and DPDP does not care that it was convenient.
    logger.info("otp_challenge_allowed")
    return OTP_WINDOW_SECONDS


async def grant_membership(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    role: str,
) -> None:
    """Add or restore a membership, then drop the cached lookup.

    The cache invalidation is not an optimisation. Without it a newly added
    recruiter waits up to 60 seconds before their access works, and support
    gets a ticket about it every single time.
    """
    await repository.upsert_membership(session, user_id=user_id, tenant_id=tenant_id, role=role)
    await membership_lookup.invalidate(user_id)


async def revoke_membership(
    session: AsyncSession, *, user_id: uuid.UUID, tenant_id: uuid.UUID
) -> None:
    """Revoke access, then drop the cached lookup.

    Here the invalidation matters far more than it does on grant: the whole
    argument for reading membership from our database rather than from a token
    claim is that revocation takes effect promptly. Sixty seconds is the
    backstop if this fails; it is not meant to be the normal path.
    """
    await repository.revoke_membership(session, user_id=user_id, tenant_id=tenant_id)
    await membership_lookup.invalidate(user_id)


# ---------------------------------------------------------------------------
# Tenants and teams (Day 9)
# ---------------------------------------------------------------------------
EMPLOYER_OWNER_ROLE = "EMPLOYER_OWNER"
EMPLOYER_TEAM_ROLES: frozenset[str] = frozenset(
    {"EMPLOYER_OWNER", "EMPLOYER_RECRUITER", "EMPLOYER_VIEWER"}
)
#: A college's team (Day 17). The admin plays the owner's part: it runs the
#: team, the subscription and the referral codes; staff import rosters.
COLLEGE_ADMIN_ROLE = "COLLEGE_ADMIN"
COLLEGE_TEAM_ROLES: frozenset[str] = frozenset({"COLLEGE_ADMIN", "COLLEGE_STAFF"})


class AlreadyInOrganisationError(ConflictError):
    """The account already belongs to an organisation, including a suspended one."""

    code = "identity_already_in_organisation"
    title = "Account already belongs to an organisation"


class AlreadyAMemberError(ConflictError):
    code = "identity_already_a_member"
    title = "Already a member of this organisation"


class CannotAddMemberError(ConflictError):
    """**One refusal for every reason that is about someone else's account.**

    The address might belong to a candidate, or to a member of another
    employer. Saying which would let any employer test whether a person is
    registered on the platform -- an enumeration oracle for exactly the
    people whose contact details the product exists to protect. The caller
    learns only that this address cannot be added.

    Residual, stated rather than hidden: "cannot be added" still differs from
    success, so an owner can learn that an address exists *somewhere*. Closing
    that needs an accept-by-link invitation, which does not exist yet.
    """

    code = "identity_cannot_add_member"
    title = "This address cannot be added"


class MemberNotFoundError(NotFoundError):
    code = "identity_member_not_found"
    title = "Team member not found"


class LastOwnerError(ConflictError):
    """An organisation must always have an owner. Without one, nobody can add
    staff, change roles, or close the account, and only a platform admin with
    a database session can recover it."""

    code = "identity_last_owner"
    title = "An organisation needs at least one owner"


@dataclass(frozen=True, slots=True)
class TeamMember:
    user_id: uuid.UUID
    email: str | None
    role: str
    added_at: datetime


def normalise_email(email: str) -> str:
    return email.strip().lower()


async def create_tenant_with_owner(
    session: AsyncSession,
    *,
    owner_user_id: uuid.UUID,
    tenant_type: str,
    name: str,
    owner_role: str,
) -> uuid.UUID:
    """Create a tenant and make the caller its owner, atomically.

    **One organisation per account.** `membership.resolve` answers "which
    tenant is this caller acting for?" with a single row, so a second
    membership would make that answer depend on row order.
    """
    await repository.lock_user(session, user_id=owner_user_id)
    if await repository.active_membership(session, user_id=owner_user_id) is not None:
        raise AlreadyInOrganisationError()

    tenant_id = await repository.create_tenant(session, tenant_type=tenant_type, name=name)
    await grant_membership(session, user_id=owner_user_id, tenant_id=tenant_id, role=owner_role)
    logger.info("tenant_created", tenant_id=str(tenant_id), tenant_type=tenant_type)
    return tenant_id


async def employer_tenant_ids(session: AsyncSession) -> list[uuid.UUID]:
    """Every employer organisation, whatever its status. **For system sweeps only.**

    The one place a tenant id comes from a table rather than a membership:
    the application-expiry sweep has no caller, and binds each of these in
    turn. `tenants` is not under RLS, and this returns identifiers only.
    Suspended employers are included -- a suspended employer is the most
    silent of all, and its candidates should be released too.
    """
    return await repository.tenant_ids_of_type(session, tenant_type="EMPLOYER")


async def rename_tenant(session: AsyncSession, *, tenant_id: uuid.UUID, name: str) -> None:
    await repository.rename_tenant(session, tenant_id=tenant_id, name=name)


async def list_team(session: AsyncSession, *, tenant_id: uuid.UUID) -> list[TeamMember]:
    rows = await repository.list_active_members(session, tenant_id=tenant_id)
    return [
        TeamMember(
            user_id=user.id, email=user.email, role=membership.role, added_at=membership.created_at
        )
        for membership, user in rows
    ]


async def add_team_member(
    session: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    email: str,
    role: str,
    team_roles: frozenset[str] = EMPLOYER_TEAM_ROLES,
) -> TeamMember:
    """Invite by email. The person gets access the first time they sign in.

    Business accounts are provisioned, not self-registered (the business
    Cognito pool is admin-create-only), so an address with no account yet gets
    one here and waits to be claimed.
    """
    if role not in team_roles:
        raise CannotAddMemberError()

    address = normalise_email(email)
    user = await repository.user_by_email(session, email=address)
    if user is None:
        user = await repository.create_business_user(session, email=address)
    if user.pool != "BUSINESS":
        # A candidate. The email column is unique across both pools, so one
        # address cannot be a candidate and a recruiter at once.
        raise CannotAddMemberError()

    await repository.lock_user(session, user_id=user.id)
    current = await repository.active_membership(session, user_id=user.id)
    if current is not None:
        if current.tenant_id == tenant_id:
            raise AlreadyAMemberError()
        raise CannotAddMemberError()

    await grant_membership(session, user_id=user.id, tenant_id=tenant_id, role=role)
    membership = await repository.get_membership(session, user_id=user.id, tenant_id=tenant_id)
    if membership is None:  # pragma: no cover - just written on this transaction
        raise MemberNotFoundError()
    return TeamMember(user_id=user.id, email=user.email, role=role, added_at=membership.created_at)


async def _ensure_another_owner(
    session: AsyncSession, *, tenant_id: uuid.UUID, leaving_user_id: uuid.UUID, owner_role: str
) -> None:
    owners = await repository.lock_active_holders_of_role(
        session, tenant_id=tenant_id, role=owner_role
    )
    if not any(owner != leaving_user_id for owner in owners):
        raise LastOwnerError()


async def _active_member(
    session: AsyncSession, *, tenant_id: uuid.UUID, user_id: uuid.UUID
) -> tuple[object, object]:
    membership = await repository.get_membership(session, user_id=user_id, tenant_id=tenant_id)
    if membership is None or membership.status != "ACTIVE":
        raise MemberNotFoundError()
    user = await repository.get_user(session, user_id)
    if user is None:  # pragma: no cover - the membership's foreign key guarantees it
        raise MemberNotFoundError()
    return membership, user


async def change_member_role(
    session: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    role: str,
    team_roles: frozenset[str] = EMPLOYER_TEAM_ROLES,
    owner_role: str = EMPLOYER_OWNER_ROLE,
) -> TeamMember:
    if role not in team_roles:
        raise MemberNotFoundError()
    membership = await repository.get_membership(session, user_id=user_id, tenant_id=tenant_id)
    if membership is None or membership.status != "ACTIVE":
        raise MemberNotFoundError()
    if membership.role == owner_role and role != owner_role:
        await _ensure_another_owner(
            session, tenant_id=tenant_id, leaving_user_id=user_id, owner_role=owner_role
        )

    await grant_membership(session, user_id=user_id, tenant_id=tenant_id, role=role)
    user = await repository.get_user(session, user_id)
    return TeamMember(
        user_id=user_id,
        email=user.email if user is not None else None,
        role=role,
        added_at=membership.created_at,
    )


async def remove_team_member(
    session: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    owner_role: str = EMPLOYER_OWNER_ROLE,
) -> None:
    """Revoke, never delete -- the row is the evidence of who could see what,
    and when. The cached membership is dropped so access ends on the next
    request, not a minute later."""
    membership = await repository.get_membership(session, user_id=user_id, tenant_id=tenant_id)
    if membership is None or membership.status != "ACTIVE":
        raise MemberNotFoundError()
    if membership.role == owner_role:
        await _ensure_another_owner(
            session, tenant_id=tenant_id, leaving_user_id=user_id, owner_role=owner_role
        )
    await revoke_membership(session, user_id=user_id, tenant_id=tenant_id)
