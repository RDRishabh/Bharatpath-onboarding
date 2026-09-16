"""questionnaire - SQLAlchemy ORM models

Optional attribute questionnaire. Imports nothing from scoring.

One row per candidate. **No score column, no points column, no tenant**: the
questionnaire is a sibling signal to the score, never an input to it (`bank.py`),
and a candidate has no tenant.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.mixins import Timestamps, UUIDPrimaryKey


class QuestionnaireResponse(Base, UUIDPrimaryKey, Timestamps):
    """Saved progress and, once submitted, the answers employers may filter on.

    `answers` holds only values validated against the bank named by
    `bank_version` at the time they were saved. Saving again after submitting
    keeps `submitted_at`: the candidate is correcting what they already shared,
    not withdrawing it.
    """

    __tablename__ = "questionnaire_responses"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    bank_version: Mapped[str] = mapped_column(String(32), nullable=False)
    answers: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __table_args__ = (UniqueConstraint("user_id", name="uq_questionnaire_response_user"),)
