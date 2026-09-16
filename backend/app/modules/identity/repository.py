"""identity - data access

Users, sessions, Cognito linkage, memberships.

All database access for this module lives here. Private to the module:
no other module may import it (import-linter contract `module-privacy`).
"""

from __future__ import annotations

import uuid

from sqlalchemy import select, text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.identity.models import Membership, Tenant, User


async def get_user(session: AsyncSession, user_id: uuid.UUID) -> User | None:
    return (await session.execute(select(User).where(User.id == user_id))).scalar_one_or_none()


async def upsert_membership(
    session: AsyncSession, *, user_id: uuid.UUID, tenant_id: uuid.UUID, role: str
) -> None:
    """Grant a role, or restore and re-role a revoked membership.

    An upsert rather than an insert because `uq_membership_user_tenant` allows
    exactly one row per user per tenant -- deliberately, so that "what role is
    this caller?" has one answer and does not depend on row order. Re-inviting
    someone who was previously removed therefore has to update the existing
    row, and an INSERT would simply fail.
    """
    await session.execute(
        pg_insert(Membership)
        .values(
            id=uuid.uuid4(),
            user_id=user_id,
            tenant_id=tenant_id,
            role=role,
            status="ACTIVE",
        )
        .on_conflict_do_update(
            constraint="uq_membership_user_tenant",
            set_={"role": role, "status": "ACTIVE"},
        )
    )


async def revoke_membership(
    session: AsyncSession, *, user_id: uuid.UUID, tenant_id: uuid.UUID
) -> None:
    """Mark a membership revoked. Never delete it.

    The row is the evidence that this person had this access during this
    period, which is exactly what an audit asks for after the fact. Deleting
    it would answer "who could see this in March?" with silence.
    """
    await session.execute(
        update(Membership)
        .where(Membership.user_id == user_id, Membership.tenant_id == tenant_id)
        .values(status="REVOKED")
    )


async def lock_user(session: AsyncSession, *, user_id: uuid.UUID) -> None:
    """Serialise membership changes for one person, for this transaction.

    **Without it one account can end up in two organisations.** Two concurrent
    requests -- a double-clicked "create organisation", or two owners adding
    the same colleague at once -- would both read "no membership yet" and both
    write one. `membership.resolve` then has two rows to choose between, and
    which tenant the person acts for would depend on row order.

    An advisory lock rather than a row lock because the row being guarded
    against does not exist yet. Released automatically at commit or rollback.
    """
    await session.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
        {"key": f"membership:{user_id}"},
    )


async def active_membership(session: AsyncSession, *, user_id: uuid.UUID) -> Membership | None:
    """Any ACTIVE membership, **whatever the state of its tenant**.

    Deliberately not `app.core.auth.membership.resolve`, which hides a
    membership whose tenant is suspended -- correctly, for authorisation. Used
    for "does this person already belong somewhere?" that would be a
    suspension bypass: the owner of a suspended employer would look
    unaffiliated, create a fresh organisation, and carry on.
    """
    result = await session.execute(
        select(Membership)
        .where(Membership.user_id == user_id, Membership.status == "ACTIVE")
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_membership(
    session: AsyncSession, *, user_id: uuid.UUID, tenant_id: uuid.UUID
) -> Membership | None:
    """Scoped to the tenant, always. A user id from a path parameter is looked
    up *within the caller's tenant*, so another organisation's member reads as
    absent -- a 404, never a 403."""
    result = await session.execute(
        select(Membership).where(Membership.user_id == user_id, Membership.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def list_active_members(
    session: AsyncSession, *, tenant_id: uuid.UUID
) -> list[tuple[Membership, User]]:
    result = await session.execute(
        select(Membership, User)
        .join(User, User.id == Membership.user_id)
        .where(Membership.tenant_id == tenant_id, Membership.status == "ACTIVE")
        .order_by(Membership.created_at, Membership.id)
    )
    return [(membership, user) for membership, user in result.all()]


async def lock_active_holders_of_role(
    session: AsyncSession, *, tenant_id: uuid.UUID, role: str
) -> list[uuid.UUID]:
    """The users holding `role` in a tenant, with their rows locked.

    `FOR UPDATE` is what makes the last-owner rule hold under concurrency. Two
    owners of a two-owner organisation each demoting the other at the same
    moment would otherwise each see one other owner, both succeed, and leave
    an organisation nobody can administer.
    """
    result = await session.execute(
        select(Membership.user_id)
        .where(
            Membership.tenant_id == tenant_id,
            Membership.role == role,
            Membership.status == "ACTIVE",
        )
        .with_for_update()
    )
    return list(result.scalars().all())


async def create_tenant(session: AsyncSession, *, tenant_type: str, name: str) -> uuid.UUID:
    tenant = Tenant(id=uuid.uuid4(), type=tenant_type, name=name, status="ACTIVE")
    session.add(tenant)
    await session.flush()
    return tenant.id


async def tenant_ids_of_type(session: AsyncSession, *, tenant_type: str) -> list[uuid.UUID]:
    result = await session.execute(
        select(Tenant.id).where(Tenant.type == tenant_type).order_by(Tenant.id)
    )
    return list(result.scalars().all())


async def rename_tenant(session: AsyncSession, *, tenant_id: uuid.UUID, name: str) -> None:
    await session.execute(update(Tenant).where(Tenant.id == tenant_id).values(name=name))


async def user_by_email(session: AsyncSession, *, email: str) -> User | None:
    result = await session.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_business_user(session: AsyncSession, *, email: str) -> User:
    """A business account row with no provider subject yet.

    **This is the invitation.** The row carries the email and no `cognito_sub`;
    when that person first signs in, `app.core.auth.users._adopt_unlinked`
    links their verified identity to this row by email, and the membership
    granted here is already waiting for them.

    `ON CONFLICT DO NOTHING` then a read, because two owners inviting the same
    new address at once is ordinary and must not surface as a 500.
    """
    await session.execute(
        pg_insert(User)
        .values(id=uuid.uuid4(), pool="BUSINESS", email=email, status="ACTIVE", locale="en")
        .on_conflict_do_nothing(index_elements=["email"])
    )
    user = await user_by_email(session, email=email)
    if user is None:  # pragma: no cover - only on a genuine constraint failure
        raise RuntimeError("could not create or read the invited business user")
    return user
