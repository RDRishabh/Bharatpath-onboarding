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

from sqlalchemy import false, literal, or_, select, text, tuple_
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


# ---------------------------------------------------------------------------
# The candidate board
# ---------------------------------------------------------------------------
# These run with `app.user_id` bound and no tenant, under the
# `jobs_candidate_board` policy. That policy also shows jobs the candidate has
# applied to, whatever their status -- so every board query below says
# `status = 'PUBLISHED'` itself rather than trusting the policy to.


def _contains(value: str) -> str:
    """An ILIKE pattern matching `value` literally, wildcards and all."""
    escaped = value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


async def search_board(
    session: AsyncSession,
    *,
    query: str | None,
    location: str | None,
    work_mode: str | None,
    skill: str | None,
    min_salary_minor: int | None,
    eligible_at_score: int | None,
    eligible_only: bool,
    after: tuple[datetime, uuid.UUID] | None,
    limit: int,
) -> list[Job]:
    """A page of published jobs, newest first, keyset-paginated.

    `eligible_only` with no score returns nothing: a candidate without a score
    can apply to nothing yet, so there is nothing eligible to show.

    Substring matching is enough for a board this size and is honest about
    what it is. The indexed search on Day 13 is for candidates, which is the
    query that grows; this one is bounded by how many jobs are live.
    """
    stmt = select(Job).where(Job.status == "PUBLISHED")
    if query:
        pattern = _contains(query)
        stmt = stmt.where(
            or_(Job.title.ilike(pattern, escape="\\"), Job.description.ilike(pattern, escape="\\"))
        )
    if location:
        stmt = stmt.where(Job.location.ilike(_contains(location), escape="\\"))
    if work_mode:
        stmt = stmt.where(Job.work_mode == work_mode)
    if skill:
        stmt = stmt.where(
            text(
                "EXISTS (SELECT 1 FROM jsonb_array_elements_text(jobs.skills) AS s(name) "
                "WHERE lower(s.name) = lower(:skill))"
            ).bindparams(skill=skill)
        )
    if min_salary_minor is not None:
        # A range that reaches the asked-for figure, not one that starts at it.
        stmt = stmt.where(Job.salary_max_minor >= min_salary_minor)
    if eligible_only:
        if eligible_at_score is None:
            stmt = stmt.where(false())
        else:
            stmt = stmt.where(or_(Job.min_score.is_(None), Job.min_score <= eligible_at_score))
    if after is not None:
        stmt = stmt.where(
            tuple_(Job.published_at, Job.id)
            < tuple_(literal(after[0], Job.published_at.type), literal(after[1], Job.id.type))
        )
    result = await session.execute(
        stmt.order_by(Job.published_at.desc(), Job.id.desc()).limit(limit)
    )
    return list(result.scalars().all())


async def get_board_job(session: AsyncSession, *, job_id: uuid.UUID) -> Job | None:
    """One published job, or None -- a draft, paused or closed job reads as absent."""
    result = await session.execute(select(Job).where(Job.id == job_id, Job.status == "PUBLISHED"))
    return result.scalar_one_or_none()


async def jobs_by_id(session: AsyncSession, *, job_ids: list[uuid.UUID]) -> list[Job]:
    """Jobs by id, **whatever their status**, as far as the policy allows.

    For the candidate's Application Board, which must still name a job that
    closed after they applied. The policy limits this to published jobs and
    jobs the candidate applied to.
    """
    if not job_ids:
        return []
    result = await session.execute(select(Job).where(Job.id.in_(job_ids)))
    return list(result.scalars().all())
