"""college - SQLAlchemy ORM models.

Institution tenant, roster, invites, consent, referral codes.

**Invariant 9 lives here.** Two things that are not negotiable:

* **Two distinct consent scopes.** `ROSTER` means the college may count you in
  aggregates; `INDIVIDUAL` means it may see you as a person. Roster consent
  never implies individual visibility (PRD rule 8), and analytics INNER JOINs
  this table rather than filtering in Python - so revoking consent makes rows
  disappear from the query itself.
* **Revocation is a timestamp, never a deletion.** You must be able to prove
  what was visible to whom on a given date.

**Referral codes are new since 2026-08-27** and run *alongside* the invite
flow, not instead of it - invites still cover students with no account yet.
Three decisions we took, all in the schema:

  1. Entering a code **is** the consent act (`granted_via = REFERRAL_CODE`).
     It is arguably better consent than invite-accept, because the student
     takes a deliberate action rather than clicking a link in a message.
  2. It grants **ROSTER scope only.** A code must not silently confer
     individual visibility.
  3. **Codes are credentials** - non-guessable, rate-limited on entry,
     revocable, expiring. A guessable code lets anyone attach themselves to a
     roster, or lets a college harvest students who never agreed to anything.
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
from app.core.mixins import TenantScoped, Timestamps, UUIDPrimaryKey


class College(Base, Timestamps):
    """College-specific columns, keyed on the shared tenant row."""

    __tablename__ = "colleges"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        primary_key=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class CollegeSeat(Base, Timestamps):
    """Admin-assigned seat allowance (client: "No of Seats ... from the admin").

    One payment per period covering up to N students - mirroring the employer
    model rather than the tiers the employer side rejected.

    **A seat replaces the student's own subscription entirely** (client,
    2026-09-12, closing C12): *"Student does not pay if the college has paid
    for it."* Two things follow, and neither is optional.

    First, `seats_used` is not bookkeeping. It is the count of students whose
    access this row is paying for, so an off-by-one here is either a student
    locked out of something bought for them or a student we are carrying free.

    Second, **this row is an entitlement**, which makes withdrawing a seat an
    access change rather than an administrative one. A student whose seat goes
    away loses access unless they buy their own - see `require_active_-
    subscription`, whose second limb this is.

    OPEN: what happens at the 501st student on a 500-seat plan? We recommend
    blocking, because it is the only option that cannot produce a surprise
    invoice. Awaiting the client (docs/questions.txt section 2C). **C12 raises
    the stakes on it**: over-allocating no longer just over-serves a seat, it
    gives away a full subscription.
    """

    __tablename__ = "college_seats"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        primary_key=True,
    )
    seats_allocated: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    seats_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    allocated_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    __table_args__ = (
        CheckConstraint("seats_allocated >= 0", name="ck_college_seats_non_negative"),
        CheckConstraint("seats_used >= 0", name="ck_college_seats_used_non_negative"),
    )


class RosterImport(Base, UUIDPrimaryKey, TenantScoped, Timestamps):
    """Bulk CSV/XLSX upload. Async, with a preview before commit.

    The preview identifies malformed and duplicate rows *before* anything is
    written (SRS 2.25.3), and the import is idempotent.
    """

    __tablename__ = "roster_imports"

    file_s3_key: Mapped[str] = mapped_column(String(512), nullable=False)
    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    valid_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    state: Mapped[str] = mapped_column(String(16), default="PENDING", nullable=False)

    __table_args__ = (
        CheckConstraint(
            "state IN ('PENDING', 'PREVIEW', 'PROCESSING', 'COMPLETED', 'FAILED')",
            name="ck_roster_imports_state",
        ),
    )


class RosterEntry(Base, UUIDPrimaryKey, TenantScoped):
    """One row of an uploaded roster, before or after matching to a user."""

    __tablename__ = "roster_entries"

    import_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("roster_imports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(320))
    match_user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    invite_state: Mapped[str] = mapped_column(String(16), default="PENDING", nullable=False)

    __table_args__ = (
        CheckConstraint(
            "invite_state IN ('PENDING', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED')",
            name="ck_roster_entries_invite_state",
        ),
        CheckConstraint(
            "phone IS NOT NULL OR email IS NOT NULL",
            name="ck_roster_entries_has_contact",
        ),
    )


class StudentConsent(Base, UUIDPrimaryKey, TenantScoped):
    """The gate on everything a college can see about a named student.

    Analytics INNER JOINs this table. Revoking sets `revoked_at`; the row is
    never deleted, because proving what was visible on a past date is a
    requirement, not a nicety.
    """

    __tablename__ = "student_consents"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    scope: Mapped[str] = mapped_column(String(16), nullable=False)
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    granted_via: Mapped[str] = mapped_column(String(16), nullable=False)
    # Consent must be stored with scope, timestamp, version and status
    # (SRS 1.15.3). The client's counsel owns the text of each version.
    consent_version: Mapped[str] = mapped_column(String(32), nullable=False)

    __table_args__ = (
        CheckConstraint("scope IN ('ROSTER', 'INDIVIDUAL')", name="ck_student_consents_scope"),
        CheckConstraint(
            "granted_via IN ('INVITE', 'REFERRAL_CODE')",
            name="ck_student_consents_granted_via",
        ),
        # One live grant per (tenant, candidate, scope). A second active row
        # would make "does consent exist?" depend on row order.
        Index(
            "uq_consent_active",
            "tenant_id",
            "candidate_id",
            "scope",
            unique=True,
            postgresql_where="revoked_at IS NULL",
        ),
        Index("ix_consent_candidate", "candidate_id"),
    )


class ReferralCode(Base, UUIDPrimaryKey, TenantScoped, Timestamps):
    """A credential, not an identifier.

    Non-guessable (generated from a CSPRNG, not sequential and not short),
    rate-limited on entry, revocable and expiring. The uniqueness constraint
    is global rather than per-tenant so a code can be resolved to its college
    without the student having to say which college they mean.
    """

    __tablename__ = "referral_codes"

    code: Mapped[str] = mapped_column(String(32), nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    max_uses: Mapped[int | None] = mapped_column(Integer)
    uses: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        UniqueConstraint("code", name="uq_referral_code"),
        CheckConstraint("uses >= 0", name="ck_referral_uses_non_negative"),
        CheckConstraint("max_uses IS NULL OR uses <= max_uses", name="ck_referral_uses_within_max"),
        Index(
            "ix_referral_codes_live",
            "code",
            postgresql_where="revoked_at IS NULL",
        ),
    )
