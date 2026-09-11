"""resume - Pydantic request/response DTOs

Upload, parse jobs, versions, review and confirm.

Separate Create / Update / Read schemas. ORM models are never exposed
directly - the schema IS the API contract, and for several modules it is also
where an invariant is enforced structurally.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.resume.domain import normalise_pasted_text


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


# ---------------------------------------------------------------------------
# Upload: presign, then complete
# ---------------------------------------------------------------------------
class UploadTicketResponse(_Base):
    """Where to PUT the file, and the rules it must satisfy.

    **No `key` field, deliberately.** The object key is derived server-side
    from the authenticated user; returning it would invite a client to send
    one back, and a presigned PUT authorises exactly the key it signed -- so a
    client-chosen key is a candidate writing into another candidate's prefix.
    """

    upload_id: uuid.UUID
    url: str
    method: Literal["PUT"] = "PUT"
    expires_in_seconds: int
    max_bytes: int = Field(
        description="Also enforced server-side from S3 metadata. A presigned "
        "PUT cannot be trusted to have honoured it."
    )
    accepted_types: list[str]


class UploadCompleteResponse(_Base):
    """202: the file is stored and accepted; parsing has not finished."""

    resume_file_id: uuid.UUID
    scan_status: Literal["PENDING", "CLEAN", "INFECTED", "FAILED"]
    parse_status: Literal["QUEUED"]


class ResumeFileStatusResponse(_Base):
    resume_file_id: uuid.UUID
    scan_status: str
    uploaded_at: datetime
    resume_version_id: uuid.UUID | None = Field(
        default=None, description="Present once parsing has produced a version."
    )


# ---------------------------------------------------------------------------
# Paste-text and manual paths (PRD 4.2)
# ---------------------------------------------------------------------------
class PasteTextRequest(_Base):
    """A CV pasted as text. No file, no scan, no OCR."""

    text: Annotated[str, Field(min_length=50)]

    @field_validator("text")
    @classmethod
    def _normalise(cls, v: str) -> str:
        """Normalised once, here, before it is stored.

        Invariant 1 requires a score to be reproducible from the stored text,
        so normalisation must happen before persistence and never again after
        -- otherwise the same stored row could score differently later.
        """
        cleaned = normalise_pasted_text(v)
        if len(cleaned) < 50:
            raise ValueError("too short to be a resume once whitespace is removed")
        return cleaned


class ManualExperience(_Base):
    employer: Annotated[str, Field(max_length=200)]
    title: Annotated[str, Field(max_length=200)]
    start_year: Annotated[int, Field(ge=1950, le=2100)]
    end_year: Annotated[int | None, Field(default=None, ge=1950, le=2100)]
    summary: Annotated[str | None, Field(default=None, max_length=2000)]


class ManualEducation(_Base):
    institution: Annotated[str, Field(max_length=200)]
    qualification: Annotated[str, Field(max_length=200)]
    completed_year: Annotated[int | None, Field(default=None, ge=1950, le=2100)]


class ManualResumeRequest(_Base):
    """The structured form (PRD 4.2), for candidates with no file to upload.

    **There is no date of birth or age field here, and there must never be.**
    Invariant 5 forbids age-gating, `scripts/check_no_age_fields.py` fails the
    build on one, and years of experience are derived from the employment
    dates rather than asked for.
    """

    full_name: Annotated[str, Field(min_length=1, max_length=200)]
    headline: Annotated[str | None, Field(default=None, max_length=300)]
    experience: Annotated[list[ManualExperience], Field(default_factory=list, max_length=40)]
    education: Annotated[list[ManualEducation], Field(default_factory=list, max_length=20)]
    skills: Annotated[
        list[Annotated[str, Field(max_length=80)]], Field(default_factory=list, max_length=100)
    ]

    @field_validator("experience")
    @classmethod
    def _end_after_start(cls, v: list[ManualExperience]) -> list[ManualExperience]:
        for role in v:
            if role.end_year is not None and role.end_year < role.start_year:
                raise ValueError(f"{role.employer}: end_year is before start_year")
        return v


class ResumeVersionResponse(_Base):
    """A created version. `parsed` is not echoed back.

    Review and confirm are Day 7; until a version is confirmed it cannot reach
    scoring, and the client has no reason to hold the parse output yet.
    """

    resume_version_id: uuid.UUID
    source: Literal["UPLOAD", "PASTE", "MANUAL"]
    confirmed: bool
    created_at: datetime
