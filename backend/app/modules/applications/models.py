"""applications - SQLAlchemy ORM models.

Apply, stages, withdraw, expiry, hire confirm.

**Duplicate application prevention is a database guarantee, not a race.** A
partial unique index on (job_id, candidate_id) where the stage is non-terminal
means two concurrent applies cannot both succeed. Note this is a *different*
mechanism from the duplicate-CV detection the client dropped on 2026-08-24 -
that one is a scoring-integrity rule, this one is a constraint, and it stays.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.mixins import TenantScoped, Timestamps, UUIDPrimaryKey
from app.modules.applications.domain import STAGES, TERMINAL_STAGES

_STAGE_LIST = ", ".join(f"'{s}'" for s in STAGES)
_TERMINAL_LIST = ", ".join(f"'{s}'" for s in TERMINAL_STAGES)


class Application(Base, UUIDPrimaryKey, TenantScoped, Timestamps):
    """One candidate's application to one job.

    Carries `tenant_id` (the employer who owns the job) so RLS applies on the
    employer side, plus `candidate_id` for the candidate's Application Board.
    """

    __tablename__ = "applications"

    # Foreign key together with `tenant_id`; see `fk_applications_job_tenant`.
    job_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    stage: Mapped[str] = mapped_column(String(16), default="SUBMITTED", nullable=False)
    # Applications auto-expire when an employer goes silent past a configured
    # period. Swept by EventBridge Scheduler, not Celery Beat.
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Two-sided hire confirmation (PRD 5.2 / SRS 1.13.3). Both must be set
    # before the platform records a final, billable hire event.
    employer_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    candidate_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    meeting_url: Mapped[str | None] = mapped_column(String(1024))
    interview_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint(f"stage IN ({_STAGE_LIST})", name="ck_applications_stage"),
        # **The tenant an application is filed under is its job's tenant, and
        # nothing else can be.** A candidate writes this row, and a candidate
        # has no tenant of their own to bind; a single-column key on `job_id`
        # would let the row claim any tenant and land in the wrong employer's
        # pipeline. Referential checks ignore RLS, so this holds for every
        # writer.
        ForeignKeyConstraint(
            ["job_id", "tenant_id"],
            ["jobs.id", "jobs.tenant_id"],
            name="fk_applications_job_tenant",
            ondelete="CASCADE",
        ),
        # The duplicate-application rule, as a database guarantee.
        Index(
            "uq_application_active",
            "job_id",
            "candidate_id",
            unique=True,
            postgresql_where=f"stage NOT IN ({_TERMINAL_LIST})",
        ),
        Index("ix_applications_candidate", "candidate_id", "created_at"),
        Index("ix_applications_job_stage", "job_id", "stage"),
        Index(
            "ix_applications_expiring",
            "expires_at",
            postgresql_where=f"stage NOT IN ({_TERMINAL_LIST})",
        ),
    )


class ApplicationEvent(Base, UUIDPrimaryKey):
    """Every stage transition. The candidate's Application Board renders from
    this, and it is the audit trail for hiring decisions.

    Append-only by convention and by grant.
    """

    __tablename__ = "application_events"

    application_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    from_stage: Mapped[str | None] = mapped_column(String(16))
    to_stage: Mapped[str] = mapped_column(String(16), nullable=False)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    note: Mapped[str | None] = mapped_column(Text)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(f"to_stage IN ({_STAGE_LIST})", name="ck_app_events_to_stage"),
        Index("ix_app_events_app_time", "application_id", "occurred_at"),
    )
