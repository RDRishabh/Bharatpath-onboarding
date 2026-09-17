"""admin - SQLAlchemy ORM models

Queues, drill-downs, disputes, suspensions.

The console reads other modules' tables and owns only one of its own:
`disputes`. Suspensions belong to `identity` (`tenant_suspensions`), because
membership resolution reads them on every request.

**A dispute is raised by one of the three external groups and closed by us.**
Three database rules hold that for every writer (baseline migration):

* **Who can see a dispute** -- the tenant policy (an employer or college reads
  its own), `disputes_candidate_*` (a candidate reads and raises their own),
  and `disputes_platform_staff` (a transaction bound to the PLATFORM tenant
  reads and works all of them).
* **What a raiser can change: nothing.** `guard_dispute_write` refuses a
  change to what was raised, moves state only along
  `domain.DISPUTE_TRANSITIONS`, and only for a staff transaction -- so an
  employer cannot mark its own dispute resolved through the permissive tenant
  policy.
* **A HIRE dispute names an application the raiser can see**, checked under
  the raiser's own row-level security.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.mixins import Timestamps, UUIDPrimaryKey
from app.modules.admin.domain import (
    DISPUTE_KINDS,
    DISPUTE_PARTIES,
    DISPUTE_SOURCES,
    DISPUTE_STATES,
    MAX_DISPUTE_DESCRIPTION,
    MAX_RESOLUTION,
)


def _in(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


class Dispute(Base, UUIDPrimaryKey, Timestamps):
    __tablename__ = "disputes"

    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    party: Mapped[str] = mapped_column(String(16), nullable=False)
    source: Mapped[str] = mapped_column(String(16), nullable=False, default="RAISED")
    raised_by: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    #: The raiser's organisation. NULL for a candidate, who has none; the
    #: tenant policy then matches nothing and the candidate policies apply.
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("tenants.id", ondelete="RESTRICT")
    )
    application_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("applications.id", ondelete="RESTRICT")
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    state: Mapped[str] = mapped_column(String(16), nullable=False, default="OPEN")
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT")
    )
    resolution: Mapped[str | None] = mapped_column(Text)
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT")
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint(_in("kind", DISPUTE_KINDS), name="ck_disputes_kind"),
        CheckConstraint(_in("party", DISPUTE_PARTIES), name="ck_disputes_party"),
        CheckConstraint(_in("source", DISPUTE_SOURCES), name="ck_disputes_source"),
        CheckConstraint(_in("state", DISPUTE_STATES), name="ck_disputes_state"),
        CheckConstraint(
            "(party = 'CANDIDATE') = (tenant_id IS NULL)", name="ck_disputes_party_tenant"
        ),
        CheckConstraint(
            "(kind = 'HIRE') = (application_id IS NOT NULL)", name="ck_disputes_hire_application"
        ),
        CheckConstraint(
            "source <> 'HIRE_DISPUTE' OR (kind = 'HIRE' AND party = 'CANDIDATE')",
            name="ck_disputes_hire_source",
        ),
        CheckConstraint(
            f"char_length(description) BETWEEN 1 AND {MAX_DISPUTE_DESCRIPTION}",
            name="ck_disputes_description",
        ),
        # Closed means closed by someone, with a reason, at a time.
        CheckConstraint(
            "(state IN ('RESOLVED', 'REJECTED')) = "
            "(resolved_at IS NOT NULL AND resolved_by IS NOT NULL AND resolution IS NOT NULL)",
            name="ck_disputes_closed_has_resolution",
        ),
        CheckConstraint(
            f"resolution IS NULL OR char_length(resolution) BETWEEN 1 AND {MAX_RESOLUTION}",
            name="ck_disputes_resolution_length",
        ),
        # A hire disputed twice is one dispute: the task that opens it runs
        # at least once, not exactly once.
        Index(
            "uq_disputes_hire_dispute",
            "application_id",
            unique=True,
            postgresql_where="source = 'HIRE_DISPUTE'",
        ),
        Index("ix_disputes_queue", "state", "created_at"),
        Index("ix_disputes_raiser", "raised_by", "created_at"),
        Index("ix_disputes_tenant", "tenant_id", "created_at"),
    )
