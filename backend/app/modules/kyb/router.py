"""kyb - HTTP layer

Submissions, documents, review state machine.

Routes only. No business logic, no repository access.
import-linter enforces the second half of that sentence.

**Owner only, every route.** The submission carries the organisation's PAN and
the signatory's contact details, and submitting it is what verifies the
organisation. Recruiters and viewers have no part in it.

**Review actions have no routes yet.** They exist in the service; exposing them
needs a platform-staff account to hold `KYB_REVIEWER`, and no such account can
exist until platform tenancy is decided (see `docs/progress.md`).
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status

from app.core.deps import EMPLOYER_OWNER, CurrentUser, DbSession, require_role
from app.modules.kyb import service
from app.modules.kyb.schemas import (
    CompleteDocumentRequest,
    DocumentTicketRequest,
    DocumentTicketResponse,
    KybFormResponse,
    KybSubmissionResponse,
    SaveAnswersRequest,
)

router = APIRouter()

OwnerOnly = Depends(require_role(EMPLOYER_OWNER))


@router.get(
    "/form",
    response_model=KybFormResponse,
    dependencies=[OwnerOnly],
    summary="The KYB form definition and its options",
)
async def form() -> KybFormResponse:
    return service.form_definition()


@router.get(
    "",
    response_model=KybSubmissionResponse,
    dependencies=[OwnerOnly],
    summary="The organisation's current KYB submission",
)
async def current(user: CurrentUser, session: DbSession) -> KybSubmissionResponse:
    return await service.current_submission(session, ctx=user)


@router.put(
    "/answers",
    response_model=KybSubmissionResponse,
    dependencies=[OwnerOnly],
    summary="Save answers, complete or not",
)
async def save_answers(
    payload: SaveAnswersRequest, user: CurrentUser, session: DbSession
) -> KybSubmissionResponse:
    """422 lists every malformed answer by field and code. Required fields are
    not enforced until submission."""
    return await service.save_answers(session, ctx=user, answers=payload.answers)


@router.post(
    "/documents",
    response_model=DocumentTicketResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[OwnerOnly],
    summary="Get a presigned URL to upload one KYB document",
)
async def document_ticket(
    payload: DocumentTicketRequest, user: CurrentUser, session: DbSession
) -> DocumentTicketResponse:
    return await service.issue_document_ticket(session, ctx=user, doc_type=payload.doc_type)


@router.post(
    "/documents/{upload_id}/complete",
    response_model=KybSubmissionResponse,
    dependencies=[OwnerOnly],
    summary="Validate an uploaded document and attach it",
)
async def complete_document(
    upload_id: uuid.UUID, payload: CompleteDocumentRequest, user: CurrentUser, session: DbSession
) -> KybSubmissionResponse:
    """The key is rebuilt from the caller's organisation, so completing another
    organisation's upload finds nothing and is a 404."""
    return await service.complete_document(
        session, ctx=user, upload_id=upload_id, doc_type=payload.doc_type
    )


@router.post(
    "/submit",
    response_model=KybSubmissionResponse,
    dependencies=[OwnerOnly],
    summary="Submit for verification",
)
async def submit(user: CurrentUser, session: DbSession) -> KybSubmissionResponse:
    """With approval switched off (the default), this approves the organisation
    at once and it can publish jobs. With it on, the submission waits for a
    reviewer. 422 lists everything still missing."""
    return await service.submit(session, ctx=user)
