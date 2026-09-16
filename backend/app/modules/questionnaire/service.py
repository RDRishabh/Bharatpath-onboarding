"""questionnaire - business rules and transaction boundaries

Optional attribute questionnaire. Imports nothing from scoring.

Services own the transaction. They never touch `Request`, and anything that
reveals private data writes its audit row on the same session before the
transaction closes.

**Save-progress, submit, report.** Saving merges: a candidate answering one
section on the bus and another at home loses neither. Submitting shares the
answers; it does not freeze them. Nothing here produces a number, and this
module imports nothing from `scoring` (invariant 4').
"""

from __future__ import annotations

import uuid
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.core.errors import ValidationError as AppValidationError
from app.core.outbox import emit
from app.modules.questionnaire import repository
from app.modules.questionnaire.bank import BANK_VERSION
from app.modules.questionnaire.domain import (
    ReportSection,
    build_report,
    current_answers,
    validate_answers,
)
from app.modules.questionnaire.events import SUBMITTED


class QuestionnaireAnswersInvalidError(AppValidationError):
    """`params.issues` lists `{question, code}` for every answer refused.
    Nothing in the request is saved when any answer is refused."""

    code = "questionnaire_answers_invalid"
    title = "Some answers could not be saved"


class QuestionnaireNotSubmittedError(NotFoundError):
    code = "questionnaire_not_submitted"
    title = "The questionnaire has not been submitted"


@dataclass(frozen=True, slots=True)
class QuestionnaireState:
    answers: dict[str, Any]
    submitted_at: datetime | None
    updated_at: datetime | None


@dataclass(frozen=True, slots=True)
class QuestionnaireReport:
    bank_version: str
    submitted_at: datetime
    sections: tuple[ReportSection, ...]


async def get_state(session: AsyncSession, *, user_id: uuid.UUID) -> QuestionnaireState:
    row = await repository.get_response(session, user_id=user_id)
    if row is None:
        return QuestionnaireState({}, None, None)
    return QuestionnaireState(current_answers(row.answers or {}), row.submitted_at, row.updated_at)


async def save_progress(
    session: AsyncSession, *, user_id: uuid.UUID, answers: Mapping[str, object]
) -> QuestionnaireState:
    """Merge these answers into what is saved. All or nothing: one refused
    answer saves none of the request, so the app never has to work out which
    half of a screen was kept."""
    stored, cleared, issues = validate_answers(answers)
    if issues:
        raise QuestionnaireAnswersInvalidError(
            params={"issues": [{"question": i.question, "code": i.code} for i in issues]}
        )
    row = await repository.lock_response(session, user_id=user_id, bank_version=BANK_VERSION)
    merged = current_answers(row.answers or {})
    merged.update(stored)
    for code in cleared:
        merged.pop(code, None)
    row = await repository.save(
        session,
        row,
        answers=merged,
        bank_version=BANK_VERSION,
        submitted_at=row.submitted_at,
    )
    return QuestionnaireState(merged, row.submitted_at, row.updated_at)


async def submit(
    session: AsyncSession, *, user_id: uuid.UUID, now: datetime | None = None
) -> QuestionnaireState:
    """Share what is saved. Every question is skippable, so an empty
    questionnaire can be submitted -- skipping all of it costs a candidate
    nothing but appearing in fewer filtered searches (`bank.py`)."""
    now = now or datetime.now(UTC)
    row = await repository.lock_response(session, user_id=user_id, bank_version=BANK_VERSION)
    answers = current_answers(row.answers or {})
    row = await repository.save(
        session, row, answers=answers, bank_version=BANK_VERSION, submitted_at=now
    )
    await emit(
        session,
        event_type=SUBMITTED,
        aggregate_type="questionnaire_response",
        aggregate_id=row.id,
        payload={"user_id": str(user_id), "bank_version": BANK_VERSION},
    )
    return QuestionnaireState(answers, row.submitted_at, row.updated_at)


async def report(session: AsyncSession, *, user_id: uuid.UUID) -> QuestionnaireReport:
    """The supplementary report: what was shared, by section. 404 until the
    questionnaire has been submitted, because until then nothing was shared."""
    row = await repository.get_response(session, user_id=user_id)
    if row is None or row.submitted_at is None:
        raise QuestionnaireNotSubmittedError()
    return QuestionnaireReport(BANK_VERSION, row.submitted_at, build_report(row.answers or {}))
