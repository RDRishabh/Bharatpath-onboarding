"""jobs - SQLAlchemy ORM models.

Composer, validation, publish gate, lifecycle.

Two constraints that are business rules expressed as database rules:

* **Salary range is mandatory** (PRD 5.2). NOT NULL, plus a check that max is
  not below min.
* **No job reaches PUBLISHED without approved KYB** (invariant 8). Enforced by
  a Postgres trigger in the Alembic baseline as well as the domain service, so
  a direct repository call still fails.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.mixins import TenantScoped, Timestamps, UUIDPrimaryKey

# SRS 1.20.6
JOB_STATES = ("DRAFT", "PUBLISHED", "PAUSED", "CLOSED")


class Job(Base, UUIDPrimaryKey, TenantScoped, Timestamps):
    __tablename__ = "jobs"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    skills: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    location: Mapped[str | None] = mapped_column(String(255))
    work_mode: Mapped[str | None] = mapped_column(String(24))
    experience_min_months: Mapped[int | None] = mapped_column(Integer)

    # Money is integer minor units (paise). Never a float.
    salary_min_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    salary_max_minor: Mapped[int] = mapped_column(Integer, nullable=False)

    # A threshold below the base is meaningless - every candidate has at least
    # 700 - so the range is constrained to the live part of the scale.
    min_score: Mapped[int | None] = mapped_column(Integer)

    status: Mapped[str] = mapped_column(String(16), default="DRAFT", nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint(
            "status IN ('DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED')",
            name="ck_jobs_status",
        ),
        CheckConstraint("salary_max_minor >= salary_min_minor", name="ck_jobs_salary_range"),
        CheckConstraint("salary_min_minor >= 0", name="ck_jobs_salary_non_negative"),
        CheckConstraint(
            "min_score IS NULL OR min_score BETWEEN 700 AND 990",
            name="ck_jobs_min_score_range",
        ),
        Index(
            "ix_jobs_published",
            "status",
            "published_at",
            postgresql_where="status = 'PUBLISHED'",
        ),
        Index("ix_jobs_tenant_status", "tenant_id", "status"),
    )
