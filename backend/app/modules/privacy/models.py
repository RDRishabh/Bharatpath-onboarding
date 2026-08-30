"""privacy - SQLAlchemy ORM models.

Export and deletion requests, DSR tracking.

PRD section 8 requires users to be able to request export or deletion, tracked
with a due date.

⚠️ **The retention policy this table enforces does not exist yet.** Deletion on
request pulls against an immutable audit trail (PRD rule 9) and against
statutory retention on financial records - and subscription and course
purchases are financial records too. Which fields are hard-deleted, which are
anonymised, and how long audit and payment rows survive is a **legal** decision
the client's counsel owes us (docs/questions.txt section 3F). It has a review
cycle attached, so it was asked early.

Until that lands, `dsr_requests` tracks the request and its due date; the
cascade itself is deliberately not implemented, because implementing it under
a guessed policy would destroy data we cannot get back.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.mixins import Timestamps, UUIDPrimaryKey


class DsrRequest(Base, UUIDPrimaryKey, Timestamps):
    """A data-subject request. Export or deletion."""

    __tablename__ = "dsr_requests"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(String(16), nullable=False)
    state: Mapped[str] = mapped_column(String(16), default="RECEIVED", nullable=False)
    # Tracked, and visible to the user (SRS 2.13.2).
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Export only: a short-lived presigned URL over an encrypted archive.
    export_s3_key: Mapped[str | None] = mapped_column(String(512))
    note: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        CheckConstraint("type IN ('EXPORT', 'DELETE')", name="ck_dsr_type"),
        CheckConstraint(
            "state IN ('RECEIVED', 'PROCESSING', 'COMPLETED', 'REJECTED')",
            name="ck_dsr_state",
        ),
        Index(
            "ix_dsr_open_by_due",
            "due_at",
            postgresql_where="state IN ('RECEIVED', 'PROCESSING')",
        ),
        Index("ix_dsr_user", "user_id", "created_at"),
    )
