"""kyb - SQLAlchemy ORM models.

Submissions, documents, review state machine.

**Built in full, then short-circuited by config.** The client confirmed the
shape on 2026-08-27: the onboarding form exists, approval is automatic, and we
build the approval mechanism plus a setting to enable or disable it. Disabling
it means automatic approval.

The state machine, the publish gate and the Postgres trigger all stay. Turning
verification back on is then a config change rather than re-introducing a gate
into a live marketplace - which matters, because auto-approval plus
whole-database employer access is the bulk-extraction risk raised in
docs/questions.txt section 1A.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.mixins import TenantScoped, Timestamps, UUIDPrimaryKey

# SRS 1.20.7
KYB_STATES = (
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
    "MORE_INFO_REQUIRED",
)


class KybSubmission(Base, UUIDPrimaryKey, TenantScoped, Timestamps):
    __tablename__ = "kyb_submissions"

    state: Mapped[str] = mapped_column(String(24), default="DRAFT", nullable=False)
    #: The form answers, as submitted. Kept whole rather than spread into
    #: columns because the form is data (`kyb/forms.py`) and will change; a
    #: submission must keep saying what was asked and answered at the time.
    answers: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False
    )
    #: Which version of the form these answers are to.
    form_version: Mapped[str | None] = mapped_column(String(64))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id")
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # A rejection must carry a reason (SRS 1.11.3).
    decision_reason: Mapped[str | None] = mapped_column(Text)
    # True when this submission was approved by the config flag rather than by
    # a human. Worth being able to tell the two apart later.
    auto_approved: Mapped[bool] = mapped_column(default=False, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "state IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', "
            "'REJECTED', 'MORE_INFO_REQUIRED')",
            name="ck_kyb_submissions_state",
        ),
        CheckConstraint(
            "state <> 'REJECTED' OR decision_reason IS NOT NULL",
            name="ck_kyb_rejection_has_reason",
        ),
        Index("ix_kyb_submissions_tenant_state", "tenant_id", "state"),
        # **One open submission per organisation.** Two would make "is this
        # employer verified?" depend on which row a query happened to find.
        # A closed submission (APPROVED or REJECTED) is history and does not
        # block a new one.
        Index(
            "uq_kyb_open_submission_per_tenant",
            "tenant_id",
            unique=True,
            postgresql_where=(
                "state IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED')"
            ),
        ),
    )


class KybDocument(Base, UUIDPrimaryKey, TenantScoped):
    """Registration and tax documents. Private bucket, presigned access only."""

    __tablename__ = "kyb_documents"

    submission_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("kyb_submissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    doc_type: Mapped[str] = mapped_column(String(64), nullable=False)
    s3_key: Mapped[str] = mapped_column(String(512), nullable=False)
    #: Sniffed from the stored bytes, never taken from the upload request.
    mime: Mapped[str | None] = mapped_column(String(64))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
