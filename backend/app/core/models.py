"""Cross-cutting tables that belong to no single module.

Module-owned tables live in `app/modules/<name>/models.py`. These four are
infrastructure: the audit trail, the idempotency store, the transactional
outbox, and versioned configuration.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class AuditEvent(Base):
    """Append-only. UPDATE and DELETE are revoked for the application role.

    Searchable by actor, action, target and time - SRS 2.25.4 requires exactly
    those four, so they are the index.
    """

    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), index=True)
    actor_role: Mapped[str] = mapped_column(String(64))
    action: Mapped[str] = mapped_column(String(64), index=True)
    target_type: Mapped[str] = mapped_column(String(64))
    target_id: Mapped[str | None] = mapped_column(String(64), index=True)
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), index=True)
    request_id: Mapped[str | None] = mapped_column(String(64))
    # `metadata` is reserved by SQLAlchemy's Declarative API.
    event_metadata: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, default=dict
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    __table_args__ = (
        Index("ix_audit_actor_time", "actor_id", "occurred_at"),
        Index("ix_audit_action_time", "action", "occurred_at"),
        Index("ix_audit_tenant_time", "tenant_id", "occurred_at"),
    )


class IdempotencyKey(Base):
    """The row itself is the lock - INSERT ... ON CONFLICT DO NOTHING.

    SRS 2.24.4 names six operations. Five of the original six survive (R14
    deleted the unlock), and subscription purchase/renewal takes the freed
    slot, because a double-charged renewal is the same failure in a new coat.
    """

    __tablename__ = "idempotency_keys"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    endpoint: Mapped[str] = mapped_column(String(255), primary_key=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    state: Mapped[str] = mapped_column(String(16), default="IN_PROGRESS")
    response_status: Mapped[int | None] = mapped_column(Integer)
    response_body: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class OutboxEvent(Base):
    """Transactional outbox.

    Notifications, analytics rollups and search reindexing must not fire on a
    transaction that later rolls back. A rolled-back course purchase must not
    move a score, and this is the mechanism that guarantees it.
    """

    __tablename__ = "outbox"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_type: Mapped[str] = mapped_column(String(128), index=True)
    aggregate_type: Mapped[str] = mapped_column(String(64))
    aggregate_id: Mapped[str] = mapped_column(String(64))
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    __table_args__ = (Index("ix_outbox_unpublished", "published_at", "created_at"),)


class ConfigValue(Base):
    """Versioned configuration.

    Every number the client changed on 27 August was already a row here, which
    is what made that rewrite a seed-data change rather than a migration. Keep
    it that way: score base and ceiling, contribution caps, integrity
    thresholds, expiry windows, prices, and per-tenant view caps all live here.
    """

    __tablename__ = "config_values"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    key: Mapped[str] = mapped_column(String(128), index=True)
    value: Mapped[dict[str, Any]] = mapped_column(JSONB)
    version: Mapped[int] = mapped_column(Integer, default=1)
    effective_from: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    note: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        UniqueConstraint("key", "version", name="uq_config_key_version"),
    )
