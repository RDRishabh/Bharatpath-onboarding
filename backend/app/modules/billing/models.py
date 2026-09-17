"""billing - SQLAlchemy ORM models.

Payments, entitlements, signed callbacks.

**An entitlement is granted only after a verified server-to-server signed
callback** (PRD section 8). Never from a client-side success callback, never
from a redirect parameter. `signature_verified_at` being NULL means the
payment grants nothing, whatever the client said -- and the database holds
that: `ck_payments_settled_only_when_verified` refuses SUCCEEDED without it,
and `guard_payment_write` (baseline migration) refuses a payment inserted as
anything but PENDING.

The raw callback payload is stored verbatim for dispute forensics, in
`payment_callbacks`, which the app role can append to and never rewrite.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterable
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
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.mixins import Timestamps, UUIDPrimaryKey
from app.modules.billing.domain import ONE_OFF_PURPOSES, PURPOSES


def _sql_list(values: Iterable[str]) -> str:
    """Generated from the domain, so the constraint and the Literal cannot drift."""
    return ", ".join(f"'{v}'" for v in values)


class Payment(Base, UUIDPrimaryKey, Timestamps):
    """One attempt to take money, from checkout to its verified outcome.

    `user_id` is who paid. For an employer that is the owner who checked out;
    the organisation is `subscriber_id`. Payments are never deleted -- they are
    the financial record the deletion carve-out keeps (blockers B3).
    """

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

    #: What was bought: a plan, a course or an interview session, by the id of the exact version
    #: priced at checkout, so a price change between checkout and callback
    #: cannot change what the money bought.
    purpose: Mapped[str] = mapped_column(String(24), nullable=False)
    item_code: Mapped[str] = mapped_column(String(64), nullable=False)
    item_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)

    #: Subscription purposes only: who the period is for.
    subscriber_type: Mapped[str | None] = mapped_column(String(16))
    subscriber_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True))
    #: Mandate debits only: the subscription being renewed.
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="RESTRICT"), index=True
    )

    #: Where the gateway sends the payer. None for a mandate debit, which has
    #: no payer in the loop.
    checkout_url: Mapped[str | None] = mapped_column(String(512))
    failure_code: Mapped[str | None] = mapped_column(String(64))
    settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # The gate. NULL means no entitlement is granted, regardless of status.
    signature_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    raw_callback: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED')",
            name="ck_payments_status",
        ),
        CheckConstraint("amount_minor >= 0", name="ck_payments_amount_non_negative"),
        CheckConstraint(
            f"purpose IN ({_sql_list(PURPOSES)})",
            name="ck_payments_purpose",
        ),
        CheckConstraint(
            "status NOT IN ('SUCCEEDED', 'REFUNDED') OR signature_verified_at IS NOT NULL",
            name="ck_payments_settled_only_when_verified",
        ),
        CheckConstraint(
            f"purpose IN ({_sql_list(sorted(ONE_OFF_PURPOSES))}) "
            "OR (subscriber_type IN ('USER', 'TENANT') "
            "AND subscriber_id IS NOT NULL)",
            name="ck_payments_subscription_has_subscriber",
        ),
        CheckConstraint(
            "purpose <> 'MANDATE_DEBIT' OR subscription_id IS NOT NULL",
            name="ck_payments_debit_has_subscription",
        ),
        # One order reference lands once.
        UniqueConstraint("provider", "provider_ref", name="uq_payment_provider_ref"),
        Index("ix_payments_user", "user_id", "created_at"),
        Index(
            "ix_payments_pending_checkout",
            "user_id",
            "purpose",
            "item_id",
            postgresql_where="status = 'PENDING'",
        ),
    )


class PaymentCallback(Base, UUIDPrimaryKey):
    """Every verified callback, verbatim, once.

    **Replay protection is the unique key.** A gateway retries until it gets a
    200, and an attacker who captured a genuine signed body can resend it; the
    second arrival finds `(provider, event_id)` taken and nothing is stored or
    processed twice. A forged callback never reaches this table: the signature
    is checked before anything is written.

    The app role may INSERT and may UPDATE only `processed_at` and `outcome`
    (column grants in the baseline). The payload is evidence, and evidence the
    application could edit would not settle a dispute.
    """

    __tablename__ = "payment_callbacks"

    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    event_id: Mapped[str] = mapped_column(String(128), nullable=False)
    event_type: Mapped[str] = mapped_column(String(48), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    signature_verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    outcome: Mapped[str | None] = mapped_column(String(32))

    __table_args__ = (
        UniqueConstraint("provider", "event_id", name="uq_payment_callback_event"),
        CheckConstraint(
            "outcome IS NULL OR outcome IN "
            "('APPLIED', 'DUPLICATE', 'REFUSED', 'UNMATCHED', 'AMOUNT_MISMATCH')",
            name="ck_payment_callbacks_outcome",
        ),
        Index(
            "ix_payment_callbacks_unprocessed",
            "received_at",
            postgresql_where="processed_at IS NULL",
        ),
    )


class Entitlement(Base, UUIDPrimaryKey, Timestamps):
    """What a successful payment bought.

    **Nothing writes this table yet.** Employer database access is NOT an
    entitlement row - it is the subscription window itself - a course is
    `course_purchases`, and a mock interview session is `interview_purchases`
    (Day 16), each held by its own database guard beside the thing it buys.
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
        # Consumed entitlements too: the erasure's predicate (Day 20 index
        # review). `ix_entitlements_usable` covers only the unconsumed.
        Index("ix_entitlements_user", "user_id"),
        Index(
            "ix_entitlements_usable",
            "user_id",
            "product",
            postgresql_where="consumed_at IS NULL",
        ),
    )
