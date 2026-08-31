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
    String,
    Text,
    func,
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
    )
    resume_version_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("resume_versions.id", ondelete="SET NULL")
    )
    # Rules are configuration-driven and versioned (SRS 1.4.5), so a rule
    # change ships as config and old signals still say which version fired.
    rule_id: Mapped[str] = mapped_column(String(64), nullable=False)
    rule_version: Mapped[str] = mapped_column(String(32), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    evidence: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
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
        Index(
            "ix_integrity_suppressing",
            "candidate_id",
            postgresql_where="severity = 'HIGH' AND state = 'OPEN'",
        ),
        Index("ix_integrity_queue", "state", "severity", "created_at"),
    )
