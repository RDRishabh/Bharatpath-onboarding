"""resume - HTTP layer

Upload, parse jobs, versions, review and confirm.

Routes only. No business logic, no repository access.
import-linter enforces the second half of that sentence.

**Every route here requires a verified candidate.** There is no guest upload
path: the client reversed that on 2026-08-27 -- *"Without login the user cannot
parse the resume"* -- so `tests/invariants/test_route_authorisation.py` fails
the build if any route below becomes reachable without a token.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status

from app.core.deps import CANDIDATE, CurrentUser, DbSession, require_role
from app.modules.resume import service
from app.modules.resume.schemas import (
    ManualResumeRequest,
    PasteTextRequest,
    ResumeFileStatusResponse,
    ResumeVersionResponse,
    UploadCompleteResponse,
    UploadTicketResponse,
)
from app.settings import get_settings

router = APIRouter()

#: A resume belongs to a candidate. An employer or college user has no resume
#: of their own, so this is a role check and not merely an authentication one.
CandidateOnly = Depends(require_role(CANDIDATE))


@router.post(
    "/uploads",
    response_model=UploadTicketResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[CandidateOnly],
    summary="Get a presigned URL to upload a CV",
)
async def create_upload(user: CurrentUser) -> UploadTicketResponse:
    """Issue a presigned PUT. **Nothing is written to the database here.**

    That is the point: an upload that is abandoned or fails midway leaves no
    partial `resume_files` row to clean up, because the row is created only
    once the bytes are there and have passed validation.

    The bucket is private and the URL expires, so this is the only way the
    object can be written -- there is no public write path to get wrong.
    """
    settings = get_settings()
    upload_id, url, ttl = await service.issue_upload_ticket(user_id=user.user_id)
    return UploadTicketResponse(
        upload_id=upload_id,
        url=url,
        expires_in_seconds=ttl,
        max_bytes=settings.resume_max_upload_bytes,
        accepted_types=settings.resume_allowed_mime_types,
    )


@router.post(
    "/uploads/{upload_id}/complete",
    response_model=UploadCompleteResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[CandidateOnly],
    summary="Validate a finished upload and queue parsing",
)
async def complete_upload(
    upload_id: uuid.UUID, user: CurrentUser, session: DbSession
) -> UploadCompleteResponse:
    """202, not 200: the file is accepted, parsing has not happened yet.

    The server re-derives the object key from the caller's id rather than
    accepting one, reads the size from S3 rather than believing the client,
    and sniffs the type from the stored bytes. A client that lies about any of
    the three changes nothing.
    """
    resume_file_id, scan_status = await service.complete_upload(
        session, user_id=user.user_id, upload_id=upload_id
    )
    return UploadCompleteResponse(
        resume_file_id=resume_file_id,
        scan_status=scan_status,
        parse_status="QUEUED",
    )


@router.get(
    "/files/{resume_file_id}",
    response_model=ResumeFileStatusResponse,
    dependencies=[CandidateOnly],
    summary="Poll an upload's scan and parse state",
)
async def file_status(
    resume_file_id: uuid.UUID, user: CurrentUser, session: DbSession
) -> ResumeFileStatusResponse:
    """404 for a file belonging to someone else, never 403 -- a 403 would
    confirm that it exists."""
    row, version = await service.get_file_status(
        session, user_id=user.user_id, resume_file_id=resume_file_id
    )
    return ResumeFileStatusResponse(
        resume_file_id=row.id,
        scan_status=row.scan_status,
        uploaded_at=row.uploaded_at,
        resume_version_id=version.id if version is not None else None,
    )


@router.post(
    "/text",
    response_model=ResumeVersionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[CandidateOnly],
    summary="Submit a CV as pasted text",
)
async def paste_text(
    payload: PasteTextRequest, user: CurrentUser, session: DbSession
) -> ResumeVersionResponse:
    """No file, so no upload, no scan and no OCR. 201 rather than 202: this
    path has nothing to do asynchronously."""
    row = await service.create_pasted_version(session, user_id=user.user_id, text=payload.text)
    return ResumeVersionResponse(
        resume_version_id=row.id,
        source="PASTE",
        confirmed=row.confirmed_at is not None,
        created_at=row.created_at,
    )


@router.post(
    "/manual",
    response_model=ResumeVersionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[CandidateOnly],
    summary="Submit a CV through the structured form",
)
async def manual_entry(
    payload: ManualResumeRequest, user: CurrentUser, session: DbSession
) -> ResumeVersionResponse:
    """PRD 4.2, for candidates with no document to upload.

    The form carries no date of birth and no age: invariant 5 forbids
    age-gating, and `scripts/check_no_age_fields.py` fails the build on one.
    """
    row = await service.create_manual_version(session, user_id=user.user_id, payload=payload)
    return ResumeVersionResponse(
        resume_version_id=row.id,
        source="MANUAL",
        confirmed=row.confirmed_at is not None,
        created_at=row.created_at,
    )
