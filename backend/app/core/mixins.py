"""Shared column mixins.

`TenantScoped` is the important one: inheriting it is what puts a table into
the Row-Level Security regime. A test in `tests/invariants/` asserts that every
table carrying a `tenant_id` column also has an RLS policy, so adding the
column without the policy fails the build rather than silently leaking.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column


class UUIDPrimaryKey:
    """UUID primary keys, generated application-side.

    Not bigserial: sequential integer ids leak volume (how many candidates do
    you have?) and make enumeration attacks trivial on any endpoint that takes
    an id. The audit and view-event tables are the deliberate exceptions -
    they are append-only firehoses where insert throughput matters more.
    """

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )


class Timestamps:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class TenantScoped:
    """Marks a table as belonging to exactly one tenant.

    Three things follow automatically for any table that inherits this:

      1. Alembic's baseline enables RLS on it and attaches the policy
         `USING (tenant_id = current_setting('app.tenant_id')::uuid)`.
      2. The session dependency issues `SET LOCAL app.tenant_id` per
         transaction, resolved from the caller's membership - never from
         client input (SRS 2.24.7).
      3. The repository filters on it as well, belt and braces.

    RLS only does anything if the connecting role is neither the table owner
    nor holds BYPASSRLS. See `scripts/init_db_roles.sql`.
    """

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
