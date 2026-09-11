"""subscriptions - SQLAlchemy ORM models.

Plans, periods, renewal, cancellation, seats.

**Recurring billing is a different system from one-off charges.** Renewal,
dunning, proration, cancellation, grace periods and reinstatement are all
state this schema has to carry.

**Both renewal paths are in scope** (client, 2026-08-27: "keep choice for the
user, manual or UPI Mandate"). That is two billing flows, not one. Manual
repurchase reuses the one-off payment path; the mandate path carries
obligations that are the usual source of overrun - per-subscriber
registration, a ceiling fixed at registration, pre-debit notification before
every charge, and revocation that happens **inside the user's UPI app where we
are never told**. A silently dead mandate is a first-class state here, not an
error.

**For an employer, this table IS the entitlement.** Access checks reduce to:
is there an active, non-lapsed subscription for this tenant right now?
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
from app.core.mixins import Timestamps, UUIDPrimaryKey


class Plan(Base, UUIDPrimaryKey, Timestamps):
    """A purchasable period. Seeded from config; prices still owed by client."""

    __tablename__ = "plans"

    audience: Mapped[str] = mapped_column(String(16), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    period: Mapped[str] = mapped_column(String(16), nullable=False)
    price_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    entitlements: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False
    )
    # Colleges only. One payment per period covering up to N students -
    # mirroring the employer model rather than the tiers the employer side
    # rejected. Behaviour at the limit is still open (we recommend: block).
    seat_allowance: Mapped[int | None] = mapped_column(Integer)
    active: Mapped[bool] = mapped_column(default=True, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "audience IN ('CANDIDATE', 'EMPLOYER', 'COLLEGE')",
            name="ck_plans_audience",
        ),
        CheckConstraint(
            "period IN ('MONTHLY', 'QUARTERLY', 'SEMESTER', 'SEMI_ANNUAL', 'ANNUAL')",
            name="ck_plans_period",
        ),
        CheckConstraint("price_minor >= 0", name="ck_plans_price_non_negative"),
        UniqueConstraint("code", "version", name="uq_plan_code_version"),
    )


class Subscription(Base, UUIDPrimaryKey, Timestamps):
    """One subscriber's current period.

    `subscriber_type` + `subscriber_id` rather than two nullable FKs, because a
    candidate subscription points at `users` and an employer or college one
    points at `tenants`.
    """

    __tablename__ = "subscriptions"

    subscriber_type: Mapped[str] = mapped_column(String(16), nullable=False)
    subscriber_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    plan_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("plans.id"), nullable=False
    )
    state: Mapped[str] = mapped_column(String(16), default="PENDING", nullable=False)

    current_period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancel_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    renews_automatically: Mapped[bool] = mapped_column(default=False, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "subscriber_type IN ('USER', 'TENANT')", name="ck_subscriptions_subscriber"
        ),
        CheckConstraint(
            "state IN ('PENDING', 'ACTIVE', 'GRACE', 'LAPSED', 'CANCELLED')",
            name="ck_subscriptions_state",
        ),
        CheckConstraint(
            "current_period_end IS NULL OR current_period_start IS NULL "
            "OR current_period_end > current_period_start",
            name="ck_subscriptions_period_order",
        ),
        # The access-window check runs on every reveal, so it must be an index
        # hit. A lapsed window must mask the very next read - there is
        # deliberately no cached entitlement to go stale.
        Index(
            "ix_subscription_active_window",
            "subscriber_type",
            "subscriber_id",
            "current_period_end",
            postgresql_where="state IN ('ACTIVE', 'GRACE')",
        ),
    )


class SubscriptionEvent(Base, UUIDPrimaryKey):
    """Every state transition. Append-only."""

    __tablename__ = "subscription_events"

    subscription_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("subscriptions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    from_state: Mapped[str | None] = mapped_column(String(16))
    to_state: Mapped[str] = mapped_column(String(16), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class UpiMandate(Base, UUIDPrimaryKey, Timestamps):
    """UPI AutoPay e-mandate. Exists only for the auto-renew path.

    `REVOKED_UNKNOWN` is a deliberate state: users can cancel a mandate inside
    their own UPI app and we are never notified, so we find out on a failed
    debit. Treating that as a first-class state rather than an error is what
    lets us fall the subscriber back to manual and warn them before access
    lapses.
    """

    __tablename__ = "upi_mandates"

    subscription_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("subscriptions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider_mandate_ref: Mapped[str] = mapped_column(String(128), nullable=False)
    state: Mapped[str] = mapped_column(String(24), default="PENDING", nullable=False)
    # Fixed at registration and cannot be exceeded without a new mandate.
    max_amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint(
            "state IN ('PENDING', 'ACTIVE', 'PAUSED', 'REVOKED', 'REVOKED_UNKNOWN', 'EXPIRED')",
            name="ck_upi_mandates_state",
        ),
        CheckConstraint("max_amount_minor > 0", name="ck_upi_mandate_ceiling"),
        UniqueConstraint("provider_mandate_ref", name="uq_upi_mandate_ref"),
    )
