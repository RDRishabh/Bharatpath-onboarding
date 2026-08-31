"""interview - SQLAlchemy ORM models.

Audio sessions, chunk upload, evaluation, +20/session.

**Audio only. No video** (client, 2026-08-24, confirming SRS 2.7 over PRD 4.4's
"audio/video"). There is no camera field, no video field and no lighting field
anywhere below. The SRS device-check table still lists "Lighting" and that row
is dead - flag it to whoever maintains the SRS.

**In-app recording, not a phone call** (confirmed twice). Answers upload per
question, progressively, so a dropped connection mid-session does not lose
earlier answers. Opus/AAC mono at 16 kHz puts a 30-second answer at ~20 KB,
which is what makes that viable on 2G.

**A completed session contributes +20, capped at +60 across all sessions.** The
cap lives in `scoring/domain.py`, not here - this table only records that a
session finished. Counting completions and clamping the total is the scoring
module's job. A fourth session may be purchased and earns nothing, which needs
an explicit pre-payment confirmation or it becomes a refund request, and
disputes cost more than the sale.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.mixins import UUIDPrimaryKey


class DeviceCheck(Base, UUIDPrimaryKey):
    """Runs BEFORE payment (SRS 1.10.1), so nobody pays then fails to start.

    Microphone, audio output, network, storage, quiet environment. No camera
    and no lighting - this is an audio product.
    """

    __tablename__ = "device_checks"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    mic_ok: Mapped[bool] = mapped_column(nullable=False)
    audio_out_ok: Mapped[bool] = mapped_column(nullable=False)
    network_kbps: Mapped[int | None] = mapped_column(Integer)
    storage_mb: Mapped[int | None] = mapped_column(Integer)
    quiet_env_ok: Mapped[bool | None] = mapped_column()
    passed: Mapped[bool] = mapped_column(nullable=False)
    checked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class InterviewSession(Base, UUIDPrimaryKey):
    __tablename__ = "interview_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    entitlement_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("entitlements.id", ondelete="SET NULL")
    )
    device_check_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("device_checks.id", ondelete="SET NULL")
    )
    state: Mapped[str] = mapped_column(String(16), default="CREATED", nullable=False)
    question_set_version: Mapped[str] = mapped_column(String(32), nullable=False)
    contribution_version: Mapped[str | None] = mapped_column(String(32))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint(
            "state IN ('CREATED', 'IN_PROGRESS', 'COMPLETED', 'EVALUATED', 'ABANDONED', 'FAILED')",
            name="ck_interview_sessions_state",
        ),
        Index(
            "ix_interview_sessions_completed",
            "user_id",
            postgresql_where="state IN ('COMPLETED', 'EVALUATED')",
        ),
    )


class InterviewAnswer(Base, UUIDPrimaryKey):
    """One recorded answer. Per-question upload, never one large file.

    `upload_state` supports interrupted-session recovery: the client keeps the
    answer locally, retries when connectivity returns, and the server accepts
    it idempotently (SRS 1.10.5).
    """

    __tablename__ = "interview_answers"

    session_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("interview_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    question_index: Mapped[int] = mapped_column(Integer, nullable=False)
    s3_key: Mapped[str | None] = mapped_column(String(512))
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    upload_state: Mapped[str] = mapped_column(String(16), default="PENDING", nullable=False)
    uploaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint(
            "upload_state IN ('PENDING', 'UPLOADING', 'STORED', 'FAILED')",
            name="ck_interview_answers_upload_state",
        ),
        CheckConstraint("question_index >= 0", name="ck_interview_answers_index"),
        # Idempotent retry: re-uploading question 3 must not create a second row.
        UniqueConstraint("session_id", "question_index", name="uq_interview_answer_slot"),
    )
