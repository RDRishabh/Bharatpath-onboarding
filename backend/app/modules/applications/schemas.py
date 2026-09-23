"""applications - Pydantic request/response DTOs

Apply, stages, withdraw, expiry, hire confirm.

Separate Create / Update / Read schemas. ORM models are never exposed
directly - the schema IS the API contract, and for several modules it is also
where an invariant is enforced structurally.

**An apply request is a job id and nothing else.** No stage, no tenant, and no
score: eligibility is judged against the stored score, and `extra="forbid"`
makes a smuggled field a 422 rather than something quietly ignored.

**Two readers, two shapes.** The candidate sees their own board: stages, who
moved them, the interview. The employer's team sees its pipeline, including
its own notes and which team member acted. A note is never in a candidate
schema -- it is what a recruiter writes about someone, not to them.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import AwareDatetime, Field

from app.core.schemas import ApiSchema

ApplicationStage = Literal[
    "SUBMITTED",
    "VIEWED",
    "SHORTLISTED",
    "INTERVIEW",
    "DECISION",
    "HIRED",
    "REJECTED",
    "WITHDRAWN",
    "EXPIRED",
]
#: `applications.domain.EMPLOYER_TARGETS`, as a type.
EmployerTarget = Literal["VIEWED", "SHORTLISTED", "INTERVIEW", "DECISION", "REJECTED"]
HireConfirmation = Literal["NONE", "PENDING", "DISPUTED", "CONFIRMED"]
EventKind = Literal["STAGE_CHANGED", "INTERVIEW_SCHEDULED", "HIRE_PROPOSED", "HIRE_DISPUTED"]
Actor = Literal["CANDIDATE", "EMPLOYER", "SYSTEM"]


class _Base(ApiSchema):
    """Every schema in this module. `ApiSchema` strips the control
    characters Postgres cannot store -- see `app/core/schemas.py`."""


class ApplyRequest(_Base):
    job_id: uuid.UUID


class InterviewDetails(_Base):
    """The interview card (SRS 1.13.2). The platform hosts no call; the link
    is the employer's own."""

    interview_at: datetime
    meeting_url: str


# ---------------------------------------------------------------------------
# The candidate's board
# ---------------------------------------------------------------------------
class ApplicationResponse(_Base):
    """One of the candidate's own applications, for their Application Board.

    The job is named but not reproduced: its threshold, like everywhere a
    candidate reads a job, is absent.
    """

    id: uuid.UUID
    job_id: uuid.UUID
    job_title: str | None = None
    employer_name: str | None = None
    stage: ApplicationStage
    #: PENDING is the candidate's cue to confirm or dispute.
    hire_confirmation: HireConfirmation = "NONE"
    interview: InterviewDetails | None = None
    created_at: datetime
    updated_at: datetime


class CandidateHistoryItem(_Base):
    """One step on the board. Who acted, as a party -- never which recruiter."""

    kind: EventKind
    from_stage: ApplicationStage | None
    to_stage: ApplicationStage
    by: Actor
    occurred_at: datetime


class ApplicationDetailResponse(ApplicationResponse):
    history: list[CandidateHistoryItem]


# ---------------------------------------------------------------------------
# The employer's pipeline
# ---------------------------------------------------------------------------
class MoveStageRequest(_Base):
    stage: EmployerTarget
    note: str | None = Field(default=None, max_length=1000)


class ScheduleInterviewRequest(_Base):
    """A time with its zone, and a link. A naive time is a 422: "10:00" means
    something different in Pune and in the server's UTC."""

    interview_at: AwareDatetime
    meeting_url: str = Field(min_length=1, max_length=1024)


class EmployerApplicationSummary(_Base):
    """An application in the employer's pipeline.

    **Not a candidate profile.** No name, contact details or score: who the
    candidate is, and what an employer may see of them, is the reveal on
    Days 13-14, behind the access window and its audit row. `candidate_id` is
    the handle that reveal will take.
    """

    id: uuid.UUID
    job_id: uuid.UUID
    candidate_id: uuid.UUID
    stage: ApplicationStage
    hire_confirmation: HireConfirmation
    interview: InterviewDetails | None = None
    created_at: datetime
    updated_at: datetime


class EmployerHistoryItem(_Base):
    kind: EventKind
    from_stage: ApplicationStage | None
    to_stage: ApplicationStage
    by: Actor
    #: The team member, for an employer action. Absent for the candidate's and
    #: the system's.
    actor_id: uuid.UUID | None
    note: str | None
    occurred_at: datetime


class EmployerApplicationDetail(EmployerApplicationSummary):
    history: list[EmployerHistoryItem]
