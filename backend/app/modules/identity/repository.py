"""identity - data access

Users, sessions, Cognito linkage, memberships.

All database access for this module lives here. Private to the module:
no other module may import it (import-linter contract `module-privacy`).
"""

from __future__ import annotations

import uuid

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.identity.models import Membership, User


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
