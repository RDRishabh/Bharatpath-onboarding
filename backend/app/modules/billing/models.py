"""billing - SQLAlchemy ORM models.

Payments, entitlements, signed callbacks.

**An entitlement is granted only after a verified server-to-server signed
callback** (PRD section 8). Never from a client-side success callback, never
from a redirect parameter. `signature_verified_at` being NULL means the
payment grants nothing, whatever the client said.

The raw callback payload is stored verbatim for dispute forensics.
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
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.mixins import Timestamps, UUIDPrimaryKey


class Payment(Base, UUIDPrimaryKey, Timestamps):
    __tablename__ = "payments"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    provider_ref: Mapped[str] = mapped_column(String(128), nullable=False)
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="PENDING", nullable=False)

    # The gate. NULL means no entitlement is granted, regardless of status.
    signature_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    raw_callback: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED')",
            name="ck_payments_status",
        ),
        CheckConstraint("amount_minor >= 0", name="ck_payments_amount_non_negative"),
        # Replay protection: the same provider reference cannot land twice.
        UniqueConstraint("provider", "provider_ref", name="uq_payment_provider_ref"),
        Index("ix_payments_user", "user_id", "created_at"),
    )


class Entitlement(Base, UUIDPrimaryKey, Timestamps):
    """What a successful payment bought.

    Used for discrete purchases (a mock interview session, a course). Employer
    database access is NOT an entitlement row - it is the subscription window
    itself.
    """

    __tablename__ = "entitlements"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    product: Mapped[str] = mapped_column(String(64), nullable=False)
    granted_by_payment_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("payments.id", ondelete="SET NULL")
    )
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        Index(
            "ix_entitlements_usable",
            "user_id",
            "product",
            postgresql_where="consumed_at IS NULL",
        ),
    )
