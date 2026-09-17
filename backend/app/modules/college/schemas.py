"""college - Pydantic request/response DTOs

Institution tenant, roster, invites, consent, referral codes.

Separate Create / Update / Read schemas. ORM models are never exposed
directly - the schema IS the API contract, and for several modules it is also
where an invariant is enforced structurally.

**No college-facing schema names a student.** A college sees seat counts and
invitation counts, and the rows of its own uploaded files. Which of those
students have accounts, who they are once linked, and anything about their
score is absent here by construction: ROSTER consent is counting, not seeing
(PRD 3.8), and INDIVIDUAL visibility is Day 18's separate grant.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.modules.college.domain import (
    CODE_LENGTH,
    MAX_CODE_USES,
    MAX_CODE_VALID_DAYS,
    MAX_ROSTER_BYTES,
)

InstitutionType = Literal[
    "UNIVERSITY",
    "DEEMED_UNIVERSITY",
    "AUTONOMOUS_COLLEGE",
    "AFFILIATED_COLLEGE",
    "ENGINEERING_COLLEGE",
    "MANAGEMENT_INSTITUTE",
    "POLYTECHNIC",
    "ITI",
    "TRAINING_INSTITUTE",
    "OTHER",
]


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


# --- the organisation ------------------------------------------------------------
class CreateCollegeRequest(_Base):
    name: str = Field(min_length=2, max_length=255)
    institution_type: InstitutionType


class UpdateCollegeRequest(_Base):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    institution_type: InstitutionType | None = None


class CollegeResponse(_Base):
    tenant_id: uuid.UUID
    name: str
    institution_type: str
    onboarding_submitted_at: datetime | None = None
    verified_at: datetime | None = None
    created_at: datetime


class TeamMemberResponse(_Base):
    user_id: uuid.UUID
    email: str | None
    role: str
    added_at: datetime


class AddTeamMemberRequest(_Base):
    email: str = Field(min_length=3, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    role: Literal["COLLEGE_ADMIN", "COLLEGE_STAFF"]


class ChangeRoleRequest(_Base):
    role: Literal["COLLEGE_ADMIN", "COLLEGE_STAFF"]


# --- onboarding ------------------------------------------------------------------
class FormOption(_Base):
    code: str
    label: str


class OnboardingResponse(_Base):
    """The form definition, its options, and what has been saved against it."""

    form: dict[str, Any]
    options: dict[str, list[FormOption]]
    answers: dict[str, Any]
    form_version: str | None
    submitted_at: datetime | None


class SaveOnboardingRequest(_Base):
    answers: dict[str, Any]


# --- seats -----------------------------------------------------------------------
class SeatsResponse(_Base):
    """Counts only. Which students hold them is not the college's to see."""

    seats_allocated: int
    seats_used: int
    seats_available: int
    subscription_active: bool = Field(
        description="Seats grant access only while the college's own subscription does."
    )


# --- referral codes --------------------------------------------------------------
class IssueCodeRequest(_Base):
    expires_in_days: int = Field(default=90, ge=1, le=MAX_CODE_VALID_DAYS)
    max_uses: int | None = Field(default=None, ge=1, le=MAX_CODE_USES)


class ReferralCodeResponse(_Base):
    id: uuid.UUID
    code: str = Field(description="Formatted for printing, e.g. `ABCD-EFGH-JKMN`.")
    state: Literal["ACTIVE", "EXPIRED", "REVOKED", "EXHAUSTED"]
    uses: int
    max_uses: int | None
    expires_at: datetime
    revoked_at: datetime | None
    created_at: datetime


# --- roster imports --------------------------------------------------------------
class RosterUploadRequest(_Base):
    """A CSV with a header row: `name`, `phone`, `email`, `student_ref`. Phone
    or email is required; other columns are ignored and listed back."""

    file_name: str = Field(min_length=1, max_length=255)
    csv: str = Field(min_length=1, max_length=MAX_ROSTER_BYTES)


class InvitationCounts(_Base):
    pending: int = 0
    sent: int = 0
    accepted: int = 0
    declined: int = 0
    expired: int = 0


class RosterImportResponse(_Base):
    id: uuid.UUID
    file_name: str
    state: Literal["PREVIEW", "COMMITTED", "DISCARDED"]
    total_rows: int
    valid_rows: int
    invalid_rows: int
    duplicate_rows: int
    ignored_columns: list[str]
    created_at: datetime
    committed_at: datetime | None
    invitations: InvitationCounts


class RosterRowResponse(_Base):
    row_number: int
    full_name: str | None
    phone: str | None
    email: str | None
    student_ref: str | None
    row_state: Literal["VALID", "INVALID", "DUPLICATE"]
    issues: list[str]
    invite_state: Literal["PENDING", "SENT", "ACCEPTED", "DECLINED", "EXPIRED"] | None


class RosterRowsPage(_Base):
    items: list[RosterRowResponse]
    next_cursor: str | None = None


class InvitationsSentResponse(_Base):
    sent: int
    invitations: InvitationCounts


# --- the student's side ----------------------------------------------------------
class ConsentTermsResponse(_Base):
    consent_version: str
    scope: Literal["ROSTER"]
    key: str = Field(description="Translation key. `text` is the English source.")
    text: str


class LinkByCodeRequest(_Base):
    code: str = Field(min_length=CODE_LENGTH, max_length=32)
    consent_version: str = Field(
        min_length=1,
        max_length=32,
        description="The version of the terms the app showed. A stale one is refused.",
    )


class AnswerInvitationRequest(_Base):
    consent_version: str = Field(min_length=1, max_length=32)


class CollegeLinkResponse(_Base):
    """One college the student is linked to. `seat_held` says whether that
    college is paying for their access; it is never a promise that it will."""

    college_id: uuid.UUID
    college_name: str | None
    scope: Literal["ROSTER", "INDIVIDUAL"]
    granted_via: Literal["REFERRAL_CODE", "INVITE"]
    granted_at: datetime
    revoked_at: datetime | None
    seat_held: bool


class CandidateInvitationResponse(_Base):
    id: uuid.UUID
    college_name: str
    sent_at: datetime
    expires_at: datetime
