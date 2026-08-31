"""discovery - SQLAlchemy ORM models.

Masked search, access-window checks, reveal audit.

**There is no `unlocks` table and no `wallet_ledger`.** The client replaced
per-candidate unlocking on 2026-08-27: an employer pays once per period and
"every student is unlocked automatically ... they can view anyone in the whole
database." The subscription IS the entitlement, so there is nothing to bill
per candidate, nothing to decrement, and no unlock row to make unique.

**That moved the risk rather than removing it**, which is what this table is
for. Blanket access destroys the natural one-row-per-unlock audit trail, but
PRD rule 9 still requires every reveal of private data to be logged - so the
audit moved to the read. Every candidate profile an employer opens writes a
row here, in the same transaction as the reveal.

This will be the fastest-growing table in the schema. It is partitioned by
month in the Alembic baseline for exactly that reason.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class CandidateViewEvent(Base):
    """The audit spine for invariant 7-prime.

    A bigserial key rather than a UUID: this is an append-only firehose where
    insert throughput matters more than opacity, and nothing external ever
    references a row by id.
    """

    __tablename__ = "candidate_view_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    viewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        # Drives the per-tenant hourly and daily view caps, which are the
        # main mitigation for the bulk-extraction risk. This index is what
        # keeps that check cheap enough to run on every reveal.
        Index("ix_view_events_tenant_time", "tenant_id", "viewed_at"),
        Index("ix_view_events_actor_time", "actor_id", "viewed_at"),
        Index("ix_view_events_candidate", "candidate_id"),
    )
