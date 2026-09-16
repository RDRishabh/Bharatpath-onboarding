"""questionnaire - HTTP layer

Optional attribute questionnaire. Imports nothing from scoring.

Routes only. No business logic, no repository access.
import-linter enforces the second half of that sentence.

Pay-first (R13): the questionnaire is a candidate tool, so every route needs
an active subscription, behind the role check.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.deps import (
    CANDIDATE,
    CurrentUser,
    DbSession,
    require_active_subscription,
    require_role,
)
from app.modules.questionnaire import service
from app.modules.questionnaire.bank import BANK_VERSION, SECTIONS
from app.modules.questionnaire.schemas import (
    OptionSchema,
    QuestionnaireReportResponse,
    QuestionnaireView,
    QuestionSchema,
    ReportItemSchema,
    ReportSectionSchema,
    SaveAnswersRequest,
    SectionSchema,
)

router = APIRouter()

PayingCandidate = [Depends(require_role(CANDIDATE)), Depends(require_active_subscription)]


def _view(state: service.QuestionnaireState) -> QuestionnaireView:
    return QuestionnaireView(
        bank_version=BANK_VERSION,
        sections=[
            SectionSchema(
                code=code,
                questions=[
                    QuestionSchema(
                        code=q.code,
                        key=q.key,
                        prompt=q.prompt,
                        type=q.type,
                        options=[OptionSchema(code=o.code, label=o.label) for o in q.options],
                        required=q.required,
                        help_text=q.help_text,
                    )
                    for q in questions
                ],
            )
            for code, questions in SECTIONS.items()
        ],
        answers=state.answers,
        submitted=state.submitted_at is not None,
        submitted_at=state.submitted_at,
        updated_at=state.updated_at,
    )


@router.get(
    "",
    response_model=QuestionnaireView,
    dependencies=PayingCandidate,
    summary="The questionnaire and the candidate's saved answers",
)
async def get_questionnaire(user: CurrentUser, session: DbSession) -> QuestionnaireView:
    return _view(await service.get_state(session, user_id=user.user_id))


@router.put(
    "/answers",
    response_model=QuestionnaireView,
    dependencies=PayingCandidate,
    summary="Save progress",
)
async def save_answers(
    payload: SaveAnswersRequest, user: CurrentUser, session: DbSession
) -> QuestionnaireView:
    """Merges into what is saved. A refused answer refuses the whole request
    (422 `questionnaire_answers_invalid`, with every issue listed)."""
    state = await service.save_progress(session, user_id=user.user_id, answers=payload.answers)
    return _view(state)


@router.post(
    "/submit",
    response_model=QuestionnaireView,
    dependencies=PayingCandidate,
    summary="Share the saved answers",
)
async def submit_questionnaire(user: CurrentUser, session: DbSession) -> QuestionnaireView:
    return _view(await service.submit(session, user_id=user.user_id))


@router.get(
    "/report",
    response_model=QuestionnaireReportResponse,
    dependencies=PayingCandidate,
    summary="The supplementary report: what was shared, by section",
)
async def questionnaire_report(
    user: CurrentUser, session: DbSession
) -> QuestionnaireReportResponse:
    report = await service.report(session, user_id=user.user_id)
    return QuestionnaireReportResponse(
        bank_version=report.bank_version,
        submitted_at=report.submitted_at,
        sections=[
            ReportSectionSchema(
                code=s.code,
                answered=s.answered,
                total=s.total,
                items=[
                    ReportItemSchema(
                        code=i.code, prompt=i.prompt, answered=i.answered, display=list(i.display)
                    )
                    for i in s.items
                ],
            )
            for s in report.sections
        ],
    )
