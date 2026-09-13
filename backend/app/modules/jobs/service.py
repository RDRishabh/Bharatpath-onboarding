"""jobs - business rules and transaction boundaries

Composer, validation, publish gate, lifecycle.

Services own the transaction. They never touch `Request`, and anything that
reveals private data writes its audit row on the same session before the
transaction closes.

**Invariant 8 -- no job is published before KYB approval -- is held twice.**
Here, where the error can say what to do about it, and in the database trigger,
where nothing can route around it. The service check is for the message; the
trigger is for the guarantee. If the two ever disagree the trigger wins, and
its error is translated into the same `kyb_required` a client already handles.

**Not yet here: the subscription gate.** Employers get the portal on signup and
can do nothing in it until they pay (R15). That is a second, independent gate
with its own error code, and it lands with subscriptions on Day 15 -- see
`require_active_subscription`, which would make every route here a 402 today.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any, Final

from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import set_transaction_tenant
from app.core.errors import (
    ConflictError,
    KybRequiredError,
    NotFoundError,
    PermissionDeniedError,
    ValidationError,
)
from app.core.logging import get_logger
from app.core.outbox import emit
from app.core.ratelimit import hit
from app.core.tenant import TenantContext
from app.modules.discovery import service as discovery_service
from app.modules.employer import service as employer_service
from app.modules.jobs import repository
from app.modules.jobs.domain import coarse_count, is_editable, refuse_transition
from app.modules.jobs.events import MODULE
from app.modules.jobs.schemas import CreateJobRequest, UpdateJobRequest

logger = get_logger(__name__)

#: Threshold previews per organisation per hour. Enough for someone composing
#: several jobs and trying thresholds; far too few to binary-search a score.
THRESHOLD_PREVIEWS_PER_HOUR: Final = 30
MAX_JOB_LIST: Final = 100


class JobNotFoundError(NotFoundError):
    code = "job_not_found"
    title = "Job not found"


class JobTransitionError(ConflictError):
    code = "job_invalid_transition"
    title = "That change is not allowed for this job"


class JobNotEditableError(ConflictError):
    """A live or closed job. Pause it first, which takes it off the board
    while it changes."""

    code = "job_not_editable"
    title = "Pause the job before editing it"


class SalaryRangeError(ValidationError):
    code = "job_salary_range_invalid"
    title = "Salary maximum is below the minimum"


async def _bind(session: AsyncSession, ctx: TenantContext) -> uuid.UUID:
    if ctx.tenant_id is None:
        raise PermissionDeniedError()
    await set_transaction_tenant(session, ctx.tenant_id)
    return ctx.tenant_id


async def _load(session: AsyncSession, ctx: TenantContext, job_id: uuid.UUID) -> Any:
    tenant_id = await _bind(session, ctx)
    job = await repository.get_job(session, tenant_id=tenant_id, job_id=job_id)
    if job is None:
        # Another organisation's job reads as absent: 404, never 403.
        raise JobNotFoundError()
    return job


async def create_job(
    session: AsyncSession, *, ctx: TenantContext, payload: CreateJobRequest
) -> Any:
    """A draft. Creating one needs no verification; publishing it does."""
    tenant_id = await _bind(session, ctx)
    job = await repository.create_job(session, tenant_id=tenant_id, fields=payload.model_dump())
    await emit(
        session,
        event_type=f"{MODULE}.job_created",
        aggregate_type="job",
        aggregate_id=job.id,
        payload={"tenant_id": str(tenant_id)},
    )
    return job


async def list_jobs(session: AsyncSession, *, ctx: TenantContext, status: str | None) -> Any:
    tenant_id = await _bind(session, ctx)
    return await repository.list_jobs(
        session, tenant_id=tenant_id, status=status, limit=MAX_JOB_LIST
    )


async def get_job(session: AsyncSession, *, ctx: TenantContext, job_id: uuid.UUID) -> Any:
    return await _load(session, ctx, job_id)


async def update_job(
    session: AsyncSession, *, ctx: TenantContext, job_id: uuid.UUID, payload: UpdateJobRequest
) -> Any:
    job = await _load(session, ctx, job_id)
    if not is_editable(job.status):
        raise JobNotEditableError(params={"status": job.status})

    changes = payload.model_dump(exclude_unset=True)
    low = changes.get("salary_min_minor", job.salary_min_minor)
    high = changes.get("salary_max_minor", job.salary_max_minor)
    if high < low:
        # Checked against the merged values: an edit that sends only a new
        # minimum can still invert a range the database would then refuse.
        raise SalaryRangeError(params={"salary_min_minor": low, "salary_max_minor": high})

    return await repository.apply_changes(session, job=job, changes=changes)


async def _move(session: AsyncSession, ctx: TenantContext, job_id: uuid.UUID, target: str) -> Any:
    job = await _load(session, ctx, job_id)
    if refuse_transition(job.status, target) is not None:
        raise JobTransitionError(params={"from": job.status, "to": target})
    return job


async def publish_job(session: AsyncSession, *, ctx: TenantContext, job_id: uuid.UUID) -> Any:
    """Put a job on the board. **Invariant 8.**

    Re-publishing a paused job re-checks verification: an employer whose KYB
    was revoked while the job was paused must not be able to bring it back.
    """
    job = await _move(session, ctx, job_id, "PUBLISHED")

    kyb_status = await employer_service.kyb_status(session, ctx=ctx)
    if kyb_status != "APPROVED":
        raise KybRequiredError(params={"kyb_status": kyb_status})

    try:
        await repository.set_status(
            session,
            job=job,
            status="PUBLISHED",
            published_at=job.published_at or datetime.now(UTC),
        )
    except DBAPIError as exc:
        # The trigger disagreed with the check above -- a status changed
        # between the read and the write. The database is the authority, and
        # the client gets the same error it would have had a moment earlier.
        if "KYB_REQUIRED" in str(exc):
            raise KybRequiredError(params={"kyb_status": "unverified"}) from exc
        raise

    await emit(
        session,
        event_type=f"{MODULE}.job_published",
        aggregate_type="job",
        aggregate_id=job.id,
        payload={"tenant_id": str(job.tenant_id)},
    )
    logger.info("job_published", job_id=str(job.id))
    return job


async def pause_job(session: AsyncSession, *, ctx: TenantContext, job_id: uuid.UUID) -> Any:
    job = await _move(session, ctx, job_id, "PAUSED")
    await repository.set_status(session, job=job, status="PAUSED")
    await emit(
        session,
        event_type=f"{MODULE}.job_paused",
        aggregate_type="job",
        aggregate_id=job.id,
        payload={"tenant_id": str(job.tenant_id)},
    )
    return job


async def close_job(session: AsyncSession, *, ctx: TenantContext, job_id: uuid.UUID) -> Any:
    """Terminal. A job that reopens is a new job."""
    job = await _move(session, ctx, job_id, "CLOSED")
    await repository.set_status(session, job=job, status="CLOSED", closed_at=datetime.now(UTC))
    await emit(
        session,
        event_type=f"{MODULE}.job_closed",
        aggregate_type="job",
        aggregate_id=job.id,
        payload={"tenant_id": str(job.tenant_id)},
    )
    return job


async def threshold_preview(
    session: AsyncSession, *, ctx: TenantContext, min_score: int
) -> dict[str, Any]:
    """How many visible candidates clear a threshold -- coarsely, and rarely.

    Rate-limited per organisation, not per user: a team of recruiters sharing
    one limit is the point, because the risk is the organisation learning a
    score, not one person asking too often.
    """
    tenant_id = await _bind(session, ctx)
    await hit(
        bucket="jobs:threshold_preview",
        subject=str(tenant_id),
        limit=THRESHOLD_PREVIEWS_PER_HOUR,
        window_seconds=3600,
    )
    count = await discovery_service.count_visible_at_or_above(session, min_score=min_score)
    approximate, fewer = coarse_count(count)
    return {"min_score": min_score, "approximate_count": approximate, "fewer_than_ten": fewer}
