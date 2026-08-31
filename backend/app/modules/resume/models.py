"""resume - SQLAlchemy ORM models.

Upload, parse jobs, versions, review and confirm.

**Versions are immutable and append-only.** An edit creates a new
`resume_versions` row pointing at the one it supersedes; it never mutates the
old one. That is what lets `scores.resume_version_id` mean something six
months later, which is half of invariant 1.

**The confirm gate is mandatory** (SRS 1.4.4). An unconfirmed version can never
reach scoring, because parsing is not 100% accurate and the candidate has to
see and correct what was extracted before a number is attached to it.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.mixins import UUIDPrimaryKey


class ResumeFile(Base, UUIDPrimaryKey):
    """The original uploaded document.

    Private bucket, SSE-KMS, presigned access only. Never a public URL
    (SRS 1.4.2). A failed upload must not create a partial record - the
    service enforces that with a transaction boundary, not cleanup logic.
    """

    __tablename__ = "resume_files"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    s3_key: Mapped[str] = mapped_column(String(512), nullable=False)
    mime: Mapped[str] = mapped_column(String(128), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    # Type is sniffed from content, never trusted from the filename or the
    # client-declared Content-Type.
    scan_status: Mapped[str] = mapped_column(String(16), default="PENDING", nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "scan_status IN ('PENDING', 'CLEAN', 'INFECTED', 'FAILED')",
            name="ck_resume_files_scan_status",
        ),
        CheckConstraint("size_bytes > 0", name="ck_resume_files_size_positive"),
        Index("ix_resume_files_user", "user_id", "uploaded_at"),
    )


class ResumeVersion(Base, UUIDPrimaryKey):
    """A structured resume. Immutable once created.

    `supersedes_id` chains versions so score history stays meaningful: every
    score points at the exact version it was computed from, and that version
    can never change underneath it.
    """

    __tablename__ = "resume_versions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    resume_file_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("resume_files.id", ondelete="SET NULL")
    )
    source: Mapped[str] = mapped_column(String(16), nullable=False)
    parsed: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)

    # NULL until the candidate has reviewed and confirmed. Scoring joins on
    # `confirmed_at IS NOT NULL` rather than checking it in Python.
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    supersedes_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("resume_versions.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "source IN ('UPLOAD', 'PASTE', 'MANUAL')", name="ck_resume_versions_source"
        ),
        Index("ix_resume_versions_user", "user_id", "created_at"),
        Index(
            "ix_resume_versions_confirmed",
            "user_id",
            postgresql_where="confirmed_at IS NOT NULL",
        ),
    )
