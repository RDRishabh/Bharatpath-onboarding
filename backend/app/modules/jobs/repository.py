"""jobs - data access

Composer, validation, publish gate, lifecycle.

All database access for this module lives here. Private to the module:
no other module may import it (import-linter contract `module-privacy`).

**`jobs` is under Row-Level Security**, and every function assumes the service
has bound `app.tenant_id` first. The `tenant_id` predicates are belt and
braces, not the isolation.

**The publish gate does not live here, and cannot be bypassed from here.**
`set_status` writes whatever it is given; the Postgres trigger
`enforce_kyb_before_publish` refuses `PUBLISHED` for an unverified employer on
the flush. Invariant 8 requires exactly that: a direct repository call fails
too.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Final

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.jobs.models import Job

#: The fields an edit may change. `status`, `published_at` and `closed_at` are
#: absent: they move only through `set_status`, the one path the lifecycle
#: rules and the publish gate sit in front of.
EDITABLE_FIELDS: Final[frozenset[str]] = frozenset(
    {
        "title",
        "description",
        "skills",
        "location",
        "work_mode",
        "experience_min_months",
        "salary_min_minor",
        "salary_max_minor",
        "min_score",
    }
)


async def create_job(session: AsyncSession, *, tenant_id: uuid.UUID, fields: dict[str, Any]) -> Job:
    unexpected = set(fields) - EDITABLE_FIELDS
    if unexpected:
        raise ValueError(f"not settable on creation: {sorted(unexpected)}")
    job = Job(tenant_id=tenant_id, status="DRAFT", **fields)
    session.add(job)
    await session.flush()
    return job


async def get_job(session: AsyncSession, *, tenant_id: uuid.UUID, job_id: uuid.UUID) -> Job | None:
    result = await session.execute(select(Job).where(Job.id == job_id, Job.tenant_id == tenant_id))
    return result.scalar_one_or_none()


async def list_jobs(
    session: AsyncSession, *, tenant_id: uuid.UUID, status: str | None, limit: int
) -> list[Job]:
    query = select(Job).where(Job.tenant_id == tenant_id)
    if status is not None:
        query = query.where(Job.status == status)
    result = await session.execute(
        query.order_by(Job.created_at.desc(), Job.id.desc()).limit(limit)
    )
    return list(result.scalars().all())


async def apply_changes(session: AsyncSession, *, job: Job, changes: dict[str, Any]) -> Job:
    unexpected = set(changes) - EDITABLE_FIELDS
    if unexpected:
        raise ValueError(f"not editable: {sorted(unexpected)}")
    for field, value in changes.items():
        setattr(job, field, value)
    await session.flush()
    return job


async def set_status(
    session: AsyncSession,
    *,
    job: Job,
    status: str,
    published_at: datetime | None = None,
    closed_at: datetime | None = None,
) -> Job:
    """Move a job. The trigger checks KYB on the flush when `status` is PUBLISHED."""
    job.status = status
    if published_at is not None:
        job.published_at = published_at
    if closed_at is not None:
        job.closed_at = closed_at
    await session.flush()
    return job
