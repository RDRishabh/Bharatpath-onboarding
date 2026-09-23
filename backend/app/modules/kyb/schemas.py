"""kyb - Pydantic request/response DTOs

Submissions, documents, review state machine.

Separate Create / Update / Read schemas. ORM models are never exposed
directly - the schema IS the API contract, and for several modules it is also
where an invariant is enforced structurally.

**No request carries a state.** A submission moves only through `submit` and
the review actions, so sending `"state": "APPROVED"` is a 422 rather than a way
to verify yourself. The answers themselves are checked against the published
form definition by `app.core.forms.validate_answers`, not by these classes --
the form is data and changes without a schema change.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import Field

from app.core.schemas import ApiSchema

KybState = Literal[
    "DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "MORE_INFO_REQUIRED"
]

#: What an answer may be. Anything richer is not a form answer.
AnswerValue = str | bool | int | list[str] | None


class _Base(ApiSchema):
    """Every schema in this module. `ApiSchema` strips the control
    characters Postgres cannot store -- see `app/core/schemas.py`."""


class KybDocumentResponse(_Base):
    doc_type: str
    mime: str | None = None
    uploaded_at: datetime


class KybSubmissionResponse(_Base):
    """The organisation's current submission. **Owner only**: it carries the
    PAN and the signatory's details."""

    submission_id: uuid.UUID | None = Field(
        default=None, description="Null until anything has been saved."
    )
    state: KybState
    form_version: str | None = None
    answers: dict[str, Any] = Field(default_factory=dict)
    documents: list[KybDocumentResponse] = Field(default_factory=list)
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    decision_reason: str | None = None
    auto_approved: bool = False


class SaveAnswersRequest(_Base):
    """A partial save. Sent fields replace what is stored; a field sent as null
    clears it. Nothing here is required until submission."""

    answers: Annotated[dict[str, AnswerValue], Field(max_length=100)]


class DocumentTicketRequest(_Base):
    doc_type: Annotated[str, Field(max_length=64)]


class DocumentTicketResponse(_Base):
    """Where to PUT the document. **No key**: it is derived from the
    authenticated organisation, and returning one invites a client to send one
    back."""

    upload_id: uuid.UUID
    doc_type: str
    url: str
    method: Literal["PUT"] = "PUT"
    expires_in_seconds: int
    max_bytes: int
    accepted_types: list[str]


class CompleteDocumentRequest(_Base):
    doc_type: Annotated[str, Field(max_length=64)]


class KybOption(_Base):
    code: str
    label: str


class KybFormResponse(_Base):
    """The form to render, and the options for every select in it. Published
    as data so four clients render one definition instead of four copies."""

    code: str
    version: str
    sections: list[dict[str, Any]]
    options: dict[str, list[KybOption]]
