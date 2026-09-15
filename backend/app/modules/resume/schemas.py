"""resume - Pydantic request/response DTOs

Upload, parse jobs, versions, review and confirm.

Separate Create / Update / Read schemas. ORM models are never exposed
directly - the schema IS the API contract, and for several modules it is also
where an invariant is enforced structurally.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.modules.resume.domain import normalise_pasted_text


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


#: Where a version's content came from. EDIT means a human corrected it; see
#: the note on the CHECK constraint in `models.py` for why that is a source
#: rather than a flag.
VersionSource = Literal["UPLOAD", "PASTE", "MANUAL", "EDIT"]


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
    """202: the file is stored and accepted; parsing has not finished.

    `parse_status` is QUEUED on a first completion. It is not fixed at that,
    because completing an upload is idempotent -- a client that retries after
    the worker has already run gets the row's real state rather than being
    told to poll for something that has already finished or failed.
    """

    resume_file_id: uuid.UUID
    scan_status: Literal["PENDING", "CLEAN", "INFECTED", "FAILED"]
    parse_status: Literal["QUEUED", "DONE", "FAILED", "BLOCKED"]


class ResumeFileStatusResponse(_Base):
    """What a client polls after the 202.

    `scan_status` and `parse_status` are separate because they fail
    differently and the candidate can act on only one of them: a document we
    cannot read is something they can fix by uploading a different file, and a
    file held by the scanner is not.
    """

    resume_file_id: uuid.UUID
    scan_status: str
    parse_status: Literal["QUEUED", "DONE", "FAILED", "BLOCKED"]
    parse_error_code: str | None = Field(
        default=None,
        description="Why parsing failed, as a code the client localises. "
        "Present only when parse_status is FAILED.",
    )
    terminal: bool = Field(
        description="True once parse_status can no longer change. **Stop "
        "polling on this, not on the presence of a version** -- a FAILED "
        "parse never produces one, and a client that waits for a version "
        "waits forever."
    )
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

    The review endpoint returns the content; this is the acknowledgement that
    a version now exists and whether it has passed the confirm gate.
    """

    resume_version_id: uuid.UUID
    source: VersionSource
    confirmed: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# Day 7: review, edit, confirm (SRS 1.4.4)
# ---------------------------------------------------------------------------
class ResumeVersionSummary(_Base):
    """One entry in the version history. No content -- the list is a chain
    view, and returning every candidate's full CV text to render a list of
    dates is bandwidth spent on data the screen does not show."""

    resume_version_id: uuid.UUID
    source: VersionSource
    confirmed: bool
    confirmed_at: datetime | None = None
    supersedes_id: uuid.UUID | None = None
    superseded: bool = Field(
        description="True once a newer version has replaced this one. A "
        "superseded version can no longer be edited or confirmed."
    )
    created_at: datetime


class ResumeVersionDetailResponse(_Base):
    """**The review screen.** The whole point of the confirm gate is that the
    candidate sees what was extracted before a number is attached to it, so
    this is the one response that returns `parsed` in full.

    Parsing is not accurate enough to skip this. A borderless-table CV, a
    scanned photo, a two-column layout -- each produces text that is plausible
    and wrong in a way only the candidate can spot.
    """

    resume_version_id: uuid.UUID
    source: VersionSource
    parsed: dict[str, Any] = Field(
        description="Exactly what was extracted or entered, including the "
        "`extractor` provenance block. This is what will be scored if it is "
        "confirmed, so it is what the candidate must be shown."
    )
    confirmed: bool
    confirmed_at: datetime | None = None
    supersedes_id: uuid.UUID | None = None
    superseded: bool
    created_at: datetime


class ResumeEditRequest(_Base):
    """A correction to a reviewed version. Sends the resume **entire**.

    Exactly one of `text` or `structured`, and the reason it is not both is
    that the two carry the same facts in different shapes: accepting both
    would make "which one is scored?" a question with an answer buried in
    merge code. Sending neither is equally a client bug, so both are 422s
    rather than a silent no-op that returns a version nobody changed.
    """

    text: Annotated[str | None, Field(default=None, min_length=50)] = None
    structured: ManualResumeRequest | None = None

    @field_validator("text")
    @classmethod
    def _normalise(cls, v: str | None) -> str | None:
        """Normalised on the way in, exactly as a paste is -- so an edited
        version and a pasted one are stored in the same shape and invariant 1
        holds identically for both."""
        if v is None:
            return None
        cleaned = normalise_pasted_text(v)
        if len(cleaned) < 50:
            raise ValueError("too short to be a resume once whitespace is removed")
        return cleaned

    @model_validator(mode="after")
    def _exactly_one(self) -> ResumeEditRequest:
        if (self.text is None) == (self.structured is None):
            raise ValueError("send exactly one of `text` or `structured`")
        return self


class ResumeConfirmResponse(_Base):
    """The gate, passed. After this the version is eligible for scoring and
    its content can never change -- a further correction creates a new,
    unconfirmed version that must be reviewed and confirmed in its turn."""

    resume_version_id: uuid.UUID
    confirmed_at: datetime
    already_confirmed: bool = Field(
        description="True when this call found the version already confirmed. "
        "Confirming twice is a retry, not an error, and `confirmed_at` still "
        "reports the original moment rather than this one."
    )
