"""engagement - SQLAlchemy ORM models

Daily app-open streaks and engagement points. Never the score.

Every tenant-scoped table carries `tenant_id` and an RLS policy.
Money is stored as integer minor units (paise) - never a float.

Neither table is tenant-scoped: a streak belongs to a candidate, and
candidates belong to no tenant. Isolation is the `user_id` every query filters
on, which comes from the verified token and never from the request.

**Three tables, three lifecycles**:

* `user_streaks` is current state, one row per candidate, updated in place
  under a row lock. It is a convenience, not the record.
* `streak_point_events` is the record. **Append-only** -- the app role holds
  no UPDATE or DELETE -- so every change to a balance is explained by a row
  saying what changed it, under which rules version.
* `streak_activity_days` is the calendar: one row per day counted, and
  nothing about the day but its date. Kept for a year, then deleted by the
  retention sweep (`domain.ACTIVITY_RETENTION_DAYS`).
"""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.mixins import Timestamps, UUIDPrimaryKey


class UserStreak(Base, Timestamps):
    """A candidate's current streak and engagement-points balance."""

    __tablename__ = "user_streaks"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    # Server defaults as well as Python ones, so a row created outside the ORM
    # starts at zero rather than failing NOT NULL.
    current_streak: Mapped[int] = mapped_column(
        Integer, default=0, server_default=text("0"), nullable=False
    )
    longest_streak: Mapped[int] = mapped_column(
        Integer, default=0, server_default=text("0"), nullable=False
    )
    last_active_on: Mapped[date | None] = mapped_column(Date)
    streak_started_on: Mapped[date | None] = mapped_column(Date)
    points_balance: Mapped[int] = mapped_column(
        Integer, default=0, server_default=text("0"), nullable=False
    )
    #: The first day ever counted, set once. The calendar needs it to tell a
    #: day before the candidate started from a day they missed, and the days
    #: table cannot say: it forgets anything older than a year.
    first_active_on: Mapped[date | None] = mapped_column(Date)

    __table_args__ = (
        CheckConstraint("current_streak >= 0", name="ck_user_streaks_current_nonnegative"),
        CheckConstraint("longest_streak >= current_streak", name="ck_user_streaks_longest"),
        # MIN_BALANCE in domain.py, held below the application too.
        CheckConstraint("points_balance >= 0", name="ck_user_streaks_balance_nonnegative"),
    )


class StreakPointEvent(Base, UUIDPrimaryKey):
    """One change to an engagement-points balance. Never updated, never deleted."""

    __tablename__ = "streak_point_events"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    #: Applied, signed. Differs from `requested_points` only when the balance
    #: floor clipped a deduction.
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    requested_points: Mapped[int] = mapped_column(Integer, nullable=False)
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)
    #: The streak broken (for a deduction) or reached (for a milestone).
    streak_length: Mapped[int] = mapped_column(Integer, nullable=False)
    streak_started_on: Mapped[date | None] = mapped_column(Date)
    milestone_days: Mapped[int | None] = mapped_column(Integer)
    #: The candidate's calendar day (IST) the change was applied on.
    activity_on: Mapped[date] = mapped_column(Date, nullable=False)
    #: Which rules produced this row. Without it, a balance computed under a
    #: 10-point deduction is indistinguishable from one under a 5-point one.
    rules_version: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint(
            "kind IN ('STREAK_BREAK_PENALTY', 'MILESTONE_AWARD')",
            name="ck_streak_point_events_kind",
        ),
        CheckConstraint("balance_after >= 0", name="ck_streak_point_events_balance"),
        CheckConstraint(
            "(kind = 'MILESTONE_AWARD') = (milestone_days IS NOT NULL)",
            name="ck_streak_point_events_milestone_days",
        ),
        Index("ix_streak_point_events_user_created", "user_id", "created_at"),
        # Belt and braces behind the row lock: a milestone is earned once per
        # streak run, and a streak breaks at most once per day.
        Index(
            "uq_streak_point_events_milestone_per_run",
            "user_id",
            "streak_started_on",
            "milestone_days",
            unique=True,
            postgresql_where=text("kind = 'MILESTONE_AWARD'"),
        ),
        Index(
            "uq_streak_point_events_break_per_day",
            "user_id",
            "activity_on",
            unique=True,
            postgresql_where=text("kind = 'STREAK_BREAK_PENALTY'"),
        ),
    )


class StreakActivityDay(Base):
    """A day the candidate opened the app. One row per day, never updated.

    **The date and nothing else.** No time of day and no count of opens: the
    calendar shows opened-or-not, and a finer record of when somebody uses an
    app is data we would hold for no feature (client, 2026-09-29).

    The app role holds INSERT and SELECT only. Rows older than a year go
    through `purge_streak_activity_days`, which decides the cut-off itself, so
    no caller can delete a day still inside the window.
    """

    __tablename__ = "streak_activity_days"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    #: The candidate's calendar day (IST), as `service.local_day` decides it.
    activity_on: Mapped[date] = mapped_column(Date, primary_key=True)

    __table_args__ = (
        # The retention sweep's predicate. The key leads with `user_id`, so
        # without this every purge is a full scan.
        Index("ix_streak_activity_days_activity_on", "activity_on"),
    )
