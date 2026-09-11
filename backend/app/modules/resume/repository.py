"""resume - data access

Upload, parse jobs, versions, review and confirm.

All database access for this module lives here. Private to the module:
no other module may import it (import-linter contract `module-privacy`).
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.resume.models import ResumeFile, ResumeVersion


async def create_resume_file(
    session: AsyncSession,
    *,
    resume_file_id: uuid.UUID,
    user_id: uuid.UUID,
    s3_key: str,
    mime: str,
    size_bytes: int,
    scan_status: str,
) -> ResumeFile:
    """Insert the row for an upload that has already been validated.

    The id is supplied rather than generated, because it is the same id the
    presigned key was built from -- which is what makes completing an upload
    twice land on the same row instead of creating a second one.
    """
    row = ResumeFile(
        id=resume_file_id,
        user_id=user_id,
        s3_key=s3_key,
        mime=mime,
        size_bytes=size_bytes,
        scan_status=scan_status,
    )
    session.add(row)
    await session.flush()
    return row


async def get_resume_file(
    session: AsyncSession, *, resume_file_id: uuid.UUID, user_id: uuid.UUID
) -> ResumeFile | None:
    """Always scoped to the owner.

    `resume_files` is keyed by user rather than tenant, so row-level security
    does not cover it -- the `user_id` predicate here IS the isolation. A miss
    returns None and the caller answers 404, never 403: a 403 would confirm
    that someone else's file exists.
    """
    result = await session.execute(
        select(ResumeFile).where(ResumeFile.id == resume_file_id, ResumeFile.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def set_scan_status(session: AsyncSession, *, resume_file_id: uuid.UUID, status: str) -> None:
    row = await session.get(ResumeFile, resume_file_id)
    if row is not None:
        row.scan_status = status
        await session.flush()


async def create_version(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    source: str,
    parsed: dict[str, Any],
    resume_file_id: uuid.UUID | None = None,
    supersedes_id: uuid.UUID | None = None,
) -> ResumeVersion:
    """Versions are append-only. There is deliberately no update function.

    A score points at the exact version it was computed from, so a version
    that could change underneath it would make every historical score
    unreproducible -- invariant 1. Edits create a new row and chain through
    `supersedes_id`.
    """
    row = ResumeVersion(
        user_id=user_id,
        source=source,
        parsed=parsed,
        resume_file_id=resume_file_id,
        supersedes_id=supersedes_id,
    )
    session.add(row)
    await session.flush()
    return row


async def latest_version_for_file(
    session: AsyncSession, *, resume_file_id: uuid.UUID
) -> ResumeVersion | None:
    result = await session.execute(
        select(ResumeVersion)
        .where(ResumeVersion.resume_file_id == resume_file_id)
        .order_by(ResumeVersion.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
