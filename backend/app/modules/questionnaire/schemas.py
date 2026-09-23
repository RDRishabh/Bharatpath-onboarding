"""questionnaire - Pydantic request/response DTOs

Optional attribute questionnaire. Imports nothing from scoring.

Separate Create / Update / Read schemas. ORM models are never exposed
directly - the schema IS the API contract, and for several modules it is also
where an invariant is enforced structurally.

**No field here is a number about the candidate.** The questionnaire is worth
zero points; a "completeness score" beside the real one would be read as a
second score, and `test_questionnaire_never_scores.py` holds that.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import Field

from app.core.schemas import ApiSchema


class _Base(ApiSchema):
    """Every schema in this module. `ApiSchema` strips the control
    characters Postgres cannot store -- see `app/core/schemas.py`."""


class OptionSchema(_Base):
    code: str
    label: str


class QuestionSchema(_Base):
    code: str
    key: str = Field(description="Translation key. `prompt` is the English fallback.")
    prompt: str
    type: Literal["SINGLE", "MULTI", "NUMBER", "BOOLEAN", "TEXT"]
    options: list[OptionSchema]
    required: bool
    help_text: str | None = None


class SectionSchema(_Base):
    code: str
    questions: list[QuestionSchema]


class QuestionnaireView(_Base):
    bank_version: str
    sections: list[SectionSchema]
    answers: dict[str, Any] = Field(description="Question code -> the saved answer.")
    submitted: bool
    submitted_at: datetime | None = None
    updated_at: datetime | None = None


class SaveAnswersRequest(_Base):
    answers: dict[str, Any] = Field(
        description="Question code -> answer. `null` clears an answer. "
        "Codes not sent are left as they are.",
        max_length=64,
    )


class ReportItemSchema(_Base):
    code: str
    prompt: str
    answered: bool
    display: list[str]


class ReportSectionSchema(_Base):
    code: str
    answered: int = Field(ge=0, description="Questions answered in this section.")
    total: int = Field(ge=0)
    items: list[ReportItemSchema]


class QuestionnaireReportResponse(_Base):
    bank_version: str
    submitted_at: datetime
    sections: list[ReportSectionSchema]
