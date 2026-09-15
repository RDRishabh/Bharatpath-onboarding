"""applications - Pydantic request/response DTOs

Apply, stages, withdraw, expiry, hire confirm.

Separate Create / Update / Read schemas. ORM models are never exposed
directly - the schema IS the API contract, and for several modules it is also
where an invariant is enforced structurally.

**An apply request is a job id and nothing else.** No stage, no tenant, and no
score: eligibility is judged against the stored score, and `extra="forbid"`
makes a smuggled field a 422 rather than something quietly ignored.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

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


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


class ApplyRequest(_Base):
    job_id: uuid.UUID


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
    created_at: datetime
    updated_at: datetime
