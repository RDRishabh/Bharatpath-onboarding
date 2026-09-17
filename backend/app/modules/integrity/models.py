"""integrity - SQLAlchemy ORM models.

Signals, severity policy, search suppression.

**Duplicate and templated-resume detection is dropped** (client, 2026-08-24:
"Don't flag for duplicates"). The rule engine still supports it - the rule is
simply not registered - so reversing costs little. Timeline-inconsistency
checking and the severity/suppression machinery stay unchanged.

> Do not confuse this with duplicate *application* prevention, which is a
> partial unique index on `applications`, is a different mechanism entirely,
> and stays.

**High severity suppresses from discovery before human review** (PRD 7.2). That
is implemented as a filter inside the discovery query, not as a separate code
path, so there is no way to forget it on a new endpoint.

Integrity detection never directly modifies the score (SRS 1.4.5).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.mixins import UUIDPrimaryKey


class IntegritySignal(Base, UUIDPrimaryKey):
    __tablename__ = "integrity_signals"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    resume_version_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("resume_versions.id", ondelete="SET NULL"), index=True
    )
    # Rules are configuration-driven and versioned (SRS 1.4.5), so a rule
    # change ships as config and old signals still say which version fired.
    rule_id: Mapped[str] = mapped_column(String(64), nullable=False)
    rule_version: Mapped[str] = mapped_column(String(32), nullable=False)
    #: Which `IntegrityThresholds` were in force. With `rule_version` this is
    #: the whole answer to "what exactly raised this?"
    thresholds_version: Mapped[str] = mapped_column(
        String(32), default="default", server_default=text("'default'"), nullable=False
    )
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    evidence: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False
    )
    state: Mapped[str] = mapped_column(String(16), default="OPEN", nullable=False)
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolution_note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint("severity IN ('LOW', 'MEDIUM', 'HIGH')", name="ck_integrity_severity"),
        CheckConstraint("state IN ('OPEN', 'CLEARED', 'CONFIRMED')", name="ck_integrity_state"),
        # The discovery query joins against this to suppress high-severity
        # candidates pre-review. It has to be an index hit or masked search
        # gets slow at exactly the wrong moment.
        #
        # **OPEN and CONFIRMED both suppress; only CLEARED restores.** The
        # original predicate matched OPEN alone, which meant a reviewer
        # *confirming* that a CV injected instructions into the model would
        # have put that candidate straight back into employer search -- the
        # one outcome worse than never flagging it. The discovery CTE uses
        # this exact predicate so the planner can use this index, and
        # `test_discovery_suppression.py` asserts the two stay identical.
        Index(
            "ix_integrity_suppressing",
            "candidate_id",
            postgresql_where="severity = 'HIGH' AND state IN ('OPEN', 'CONFIRMED')",
        ),
        Index("ix_integrity_queue", "state", "severity", "created_at"),
    )


class IntegrityCheck(Base, UUIDPrimaryKey):
    """That a resume version has been through the rules -- whatever they found.

    **This row is what makes suppression fail closed.** Integrity runs
    asynchronously, after a score is computed, so there is a window in which a
    candidate has a score and no signals yet. Without a record that the check
    ran, "no signals" is ambiguous between *clean* and *not looked at*, and a
    CV carrying injected instructions would be visible to every employer for
    exactly that window. Discovery therefore shows a candidate only when this
    row exists for their current scored version: unchecked is invisible.

    Unique on `(resume_version_id, rule_version)`, which makes the evaluation
    idempotent under at-least-once delivery. Discovery accepts a check under
    *any* rule version, so bumping `RULE_VERSION` does not make every existing
    candidate vanish until they are re-evaluated.
    """

    __tablename__ = "integrity_checks"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    resume_version_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("resume_versions.id", ondelete="CASCADE"),
        nullable=False,
    )
    rule_version: Mapped[str] = mapped_column(String(32), nullable=False)
    #: Which `IntegrityThresholds` were in force. With `rule_version` this is
    #: the whole answer to "what exactly raised this?"
    thresholds_version: Mapped[str] = mapped_column(
        String(32), default="default", server_default=text("'default'"), nullable=False
    )
    #: NULL when the check found nothing. Stored so the reviewer queue and the
    #: event can say what a check concluded without re-reading every signal.
    highest_severity: Mapped[str | None] = mapped_column(String(16))
    signal_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    checked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "resume_version_id", "rule_version", name="uq_integrity_checks_version_rule"
        ),
        CheckConstraint(
            "highest_severity IS NULL OR highest_severity IN ('LOW', 'MEDIUM', 'HIGH')",
            name="ck_integrity_checks_severity",
        ),
        CheckConstraint("signal_count >= 0", name="ck_integrity_checks_count"),
        # A count with no severity, or a severity with no signals, is a check
        # that disagrees with itself. Both halves, so neither can drift.
        CheckConstraint(
            "(signal_count = 0) = (highest_severity IS NULL)",
            name="ck_integrity_checks_count_matches_severity",
        ),
        Index("ix_integrity_checks_version", "resume_version_id"),
    )
