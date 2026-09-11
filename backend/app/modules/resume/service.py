"""resume - business rules and transaction boundaries

Upload, parse jobs, versions, review and confirm.

Services own the transaction. They never touch `Request`, and anything that
reveals private data writes its audit row on the same session before the
transaction closes.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import storage
from app.core.errors import NotFoundError, ValidationError
from app.core.logging import get_logger
from app.core.outbox import emit
from app.modules.resume import repository
from app.modules.resume.domain import sniff_mime, upload_key, validate_upload
from app.modules.resume.events import MODULE
from app.modules.resume.scanner import get_document_scanner
from app.modules.resume.schemas import ManualResumeRequest
from app.settings import Settings, get_settings

logger = get_logger(__name__)


class UploadNotFoundError(NotFoundError):
    """Completing or reading an upload that is not there."""

    code = "resume_upload_not_found"
    title = "Upload not found"


class UploadRejectedError(ValidationError):
    """The stored object is not an acceptable resume.

    Carries the domain's reason code so the client renders the right localised
    message rather than a sentence written here.
    """

    code = "resume_upload_rejected"
    title = "Upload rejected"


async def issue_upload_ticket(
    *, user_id: uuid.UUID, settings: Settings | None = None
) -> tuple[uuid.UUID, str, int]:
    """Presign a PUT. **Writes nothing.**

    This is the transaction boundary the plan asks for, expressed as an
    absence: no row exists until bytes have arrived and passed validation, so
    a failed or abandoned upload cannot leave a partial `resume_files` record
    behind. There is no cleanup path because there is nothing to clean up --
    an orphaned object expires by bucket lifecycle.
    """
    settings = settings or get_settings()
    upload_id = uuid.uuid4()
    key = upload_key(user_id=user_id, upload_id=upload_id)
    url = await storage.presign_put(
        bucket=settings.s3_bucket_resumes,
        key=key,
        expires_in=settings.presigned_url_ttl_seconds,
    )
    return upload_id, url, settings.presigned_url_ttl_seconds


async def complete_upload(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    upload_id: uuid.UUID,
    settings: Settings | None = None,
) -> tuple[uuid.UUID, str]:
    """Validate what was actually stored, then record it -- in that order.

    Everything that can refuse the upload happens before the first write, so
    the row and its event are one atomic unit on the caller's transaction.

    Nothing is trusted from the client: the key is rebuilt from the
    authenticated user, the size is read from S3 rather than accepted, and the
    type is sniffed from the stored bytes.

    Completing the same upload twice returns the existing row instead of
    creating a second one -- the row id IS the upload id, so a retried request
    is naturally idempotent.
    """
    settings = settings or get_settings()
    bucket = settings.s3_bucket_resumes
    key = upload_key(user_id=user_id, upload_id=upload_id)

    existing = await repository.get_resume_file(session, resume_file_id=upload_id, user_id=user_id)
    if existing is not None:
        return existing.id, existing.scan_status

    meta = await storage.head_object(bucket=bucket, key=key)
    if meta is None:
        raise UploadNotFoundError()

    head = await storage.read_head_bytes(bucket=bucket, key=key, count=settings.resume_sniff_bytes)
    rejection = validate_upload(
        head=head,
        size_bytes=meta["size_bytes"],
        max_bytes=settings.resume_max_upload_bytes,
        allowed=settings.resume_allowed_mime_types,
    )
    if rejection is not None:
        # Remove the object before refusing. A rejected file left in the
        # bucket is storage we pay for and personal data we hold under DPDP
        # with no lawful reason to.
        await storage.delete_object(bucket=bucket, key=key)
        logger.info("upload_rejected", reason=rejection.code, user_id=str(user_id))
        raise UploadRejectedError(code=rejection.code, params={"detail": rejection.detail})

    mime = sniff_mime(head) or "application/octet-stream"
    scan_status = await get_document_scanner(settings).scan(bucket=bucket, key=key)

    row = await repository.create_resume_file(
        session,
        resume_file_id=upload_id,
        user_id=user_id,
        s3_key=key,
        mime=mime,
        size_bytes=meta["size_bytes"],
        scan_status=scan_status,
    )

    # Emitted on the same transaction as the row. The relay publishes only
    # after that commits, so a rolled-back upload can never queue a parse job
    # for a row that does not exist.
    await emit(
        session,
        event_type=f"{MODULE}.file_uploaded",
        aggregate_type="resume_file",
        aggregate_id=row.id,
        payload={"user_id": str(user_id), "mime": mime, "scan_status": scan_status},
    )
    return row.id, scan_status


async def create_pasted_version(session: AsyncSession, *, user_id: uuid.UUID, text: str) -> Any:
    """The paste-text path. No file, no scan, no OCR -- the text is the input.

    It arrives already normalised: `PasteTextRequest` does that on the way in,
    once, so what is scored is exactly what is stored (invariant 1).
    """
    row = await repository.create_version(
        session,
        user_id=user_id,
        source="PASTE",
        parsed={
            "raw_text": text,
            "extractor": {"parser": "paste", "parser_version": "1"},
        },
    )
    await emit(
        session,
        event_type=f"{MODULE}.version_created",
        aggregate_type="resume_version",
        aggregate_id=row.id,
        payload={"user_id": str(user_id), "source": "PASTE"},
    )
    return row


async def create_manual_version(
    session: AsyncSession, *, user_id: uuid.UUID, payload: ManualResumeRequest
) -> Any:
    """The structured-form path (PRD 4.2), for candidates with no file.

    Stored in the same `parsed` shape a parser produces, so scoring has one
    input format rather than three.
    """
    row = await repository.create_version(
        session,
        user_id=user_id,
        source="MANUAL",
        parsed={
            "full_name": payload.full_name,
            "headline": payload.headline,
            "experience": [e.model_dump() for e in payload.experience],
            "education": [e.model_dump() for e in payload.education],
            "skills": list(payload.skills),
            "extractor": {"parser": "manual", "parser_version": "1"},
        },
    )
    await emit(
        session,
        event_type=f"{MODULE}.version_created",
        aggregate_type="resume_version",
        aggregate_id=row.id,
        payload={"user_id": str(user_id), "source": "MANUAL"},
    )
    return row


async def get_file_status(
    session: AsyncSession, *, user_id: uuid.UUID, resume_file_id: uuid.UUID
) -> tuple[Any, Any]:
    """Status for one upload, scoped to its owner.

    A miss raises 404 even when the file exists for someone else -- a 403
    would confirm that it does.
    """
    row = await repository.get_resume_file(session, resume_file_id=resume_file_id, user_id=user_id)
    if row is None:
        raise UploadNotFoundError()
    version = await repository.latest_version_for_file(session, resume_file_id=row.id)
    return row, version
