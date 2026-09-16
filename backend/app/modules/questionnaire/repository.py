"""questionnaire - data access

Optional attribute questionnaire. Imports nothing from scoring.

All database access for this module lives here. Private to the module:
no other module may import it (import-linter contract `module-privacy`).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.questionnaire.models import QuestionnaireResponse


async def get_response(
    session: AsyncSession, *, user_id: uuid.UUID
) -> QuestionnaireResponse | None:
    result = await session.execute(
        select(QuestionnaireResponse).where(QuestionnaireResponse.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def lock_response(
    session: AsyncSession, *, user_id: uuid.UUID, bank_version: str
) -> QuestionnaireResponse:
    """The candidate's row, created if absent, locked for this transaction --
    so two saves from two devices merge rather than one overwriting the other."""
    await session.execute(
        pg_insert(QuestionnaireResponse)
        .values(id=uuid.uuid4(), user_id=user_id, bank_version=bank_version, answers={})
        .on_conflict_do_nothing(constraint="uq_questionnaire_response_user")
    )
    result = await session.execute(
        select(QuestionnaireResponse)
        .where(QuestionnaireResponse.user_id == user_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return result.scalar_one()


async def save(
    session: AsyncSession,
    row: QuestionnaireResponse,
    *,
    answers: dict[str, Any],
    bank_version: str,
    submitted_at: datetime | None,
) -> QuestionnaireResponse:
    row.answers = answers
    row.bank_version = bank_version
    row.submitted_at = submitted_at
    await session.flush()
    await session.refresh(row)
    return row
