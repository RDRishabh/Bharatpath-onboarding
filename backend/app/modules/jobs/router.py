"""jobs - HTTP layer

Composer, validation, publish gate, lifecycle.

Routes only. No business logic, no repository access.
import-linter enforces the second half of that sentence.

**Roles.** Owners and recruiters compose, edit and move jobs; viewers read
them. Publishing needs approved KYB (invariant 8), enforced in the service and
by a database trigger. Every job belongs to the caller's organisation and
another organisation's job is a 404.

**Route order matters.** `/threshold-preview` is declared before `/{job_id}`,
or the literal path would be matched as a job id and answered with a 422.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.deps import (
    EMPLOYER_OWNER,
    EMPLOYER_RECRUITER,
    EMPLOYER_VIEWER,
    CurrentUser,
    DbSession,
    require_role,
)
from app.modules.jobs import service
from app.modules.jobs.domain import THRESHOLD_STEP
from app.modules.jobs.schemas import (
    CreateJobRequest,
    JobResponse,
    JobStatus,
    ThresholdPreviewResponse,
    UpdateJobRequest,
)

router = APIRouter()

Composers = Depends(require_role(EMPLOYER_OWNER, EMPLOYER_RECRUITER))
Readers = Depends(require_role(EMPLOYER_OWNER, EMPLOYER_RECRUITER, EMPLOYER_VIEWER))


def _job(row: object) -> JobResponse:
    return JobResponse.model_validate(row)


@router.post(
    "",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Composers],
    summary="Create a draft job",
)
async def create_job(
    payload: CreateJobRequest, user: CurrentUser, session: DbSession
) -> JobResponse:
    return _job(await service.create_job(session, ctx=user, payload=payload))


@router.get(
    "",
    response_model=list[JobResponse],
    dependencies=[Readers],
    summary="The organisation's jobs, newest first",
)
async def list_jobs(
    user: CurrentUser,
    session: DbSession,
    status_filter: Annotated[JobStatus | None, Query(alias="status")] = None,
) -> list[JobResponse]:
    return [_job(j) for j in await service.list_jobs(session, ctx=user, status=status_filter)]


@router.get(
    "/threshold-preview",
    response_model=ThresholdPreviewResponse,
    dependencies=[Composers],
    summary="Roughly how many visible candidates clear a score threshold",
)
async def threshold_preview(
    user: CurrentUser,
    session: DbSession,
    min_score: Annotated[int, Query(ge=700, le=990, multiple_of=THRESHOLD_STEP)],
) -> ThresholdPreviewResponse:
    """A coarse count only, in steps of ten, rate-limited per organisation. An
    exact count would let an employer binary-search one candidate's score."""
    return ThresholdPreviewResponse(
        **await service.threshold_preview(session, ctx=user, min_score=min_score)
    )


@router.get(
    "/{job_id}",
    response_model=JobResponse,
    dependencies=[Readers],
    summary="One job",
)
async def get_job(job_id: uuid.UUID, user: CurrentUser, session: DbSession) -> JobResponse:
    return _job(await service.get_job(session, ctx=user, job_id=job_id))


@router.patch(
    "/{job_id}",
    response_model=JobResponse,
    dependencies=[Composers],
    summary="Edit a draft or paused job",
)
async def update_job(
    job_id: uuid.UUID, payload: UpdateJobRequest, user: CurrentUser, session: DbSession
) -> JobResponse:
    """409 for a published or closed job. A live job is paused before it
    changes, so nobody applies on terms that are then altered."""
    return _job(await service.update_job(session, ctx=user, job_id=job_id, payload=payload))


@router.post(
    "/{job_id}/publish",
    response_model=JobResponse,
    dependencies=[Composers],
    summary="Put a job on the board (requires approved KYB)",
)
async def publish_job(job_id: uuid.UUID, user: CurrentUser, session: DbSession) -> JobResponse:
    """403 `kyb_required` until the organisation is verified. Invariant 8."""
    return _job(await service.publish_job(session, ctx=user, job_id=job_id))


@router.post(
    "/{job_id}/pause",
    response_model=JobResponse,
    dependencies=[Composers],
    summary="Take a published job off the board",
)
async def pause_job(job_id: uuid.UUID, user: CurrentUser, session: DbSession) -> JobResponse:
    return _job(await service.pause_job(session, ctx=user, job_id=job_id))


@router.post(
    "/{job_id}/close",
    response_model=JobResponse,
    dependencies=[Composers],
    summary="Close a job for good",
)
async def close_job(job_id: uuid.UUID, user: CurrentUser, session: DbSession) -> JobResponse:
    return _job(await service.close_job(session, ctx=user, job_id=job_id))
