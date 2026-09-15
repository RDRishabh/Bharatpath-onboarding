"""candidate - Pydantic request/response DTOs

Candidate profile, settings, language preference.

Separate Create / Update / Read schemas. ORM models are never exposed
directly - the schema IS the API contract, and for several modules it is also
where an invariant is enforced structurally.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.candidate.domain import MAX_CITY_LENGTH, STATE_CODES, normalise_city
from app.modules.discovery.domain import MAX_CARD_SKILLS, MAX_EXPERIENCE_YEARS, displayable_skills
from app.modules.discovery.schemas import Badge, ScoreBand


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


class LocationRequest(_Base):
    """Replaces the candidate's location. Send `null` to clear either half.

    Both halves are optional and independent: "Maharashtra" without a city is
    a real answer from someone willing to relocate within the state.
    """

    city: Annotated[str | None, Field(default=None, max_length=MAX_CITY_LENGTH * 2)] = None
    state_code: Annotated[str | None, Field(default=None, min_length=2, max_length=2)] = None

    @field_validator("city")
    @classmethod
    def _city(cls, value: str | None) -> str | None:
        return None if value is None else normalise_city(value)

    @field_validator("state_code")
    @classmethod
    def _state(cls, value: str | None) -> str | None:
        if value is not None and value not in STATE_CODES:
            raise ValueError("not a state or union territory code")
        return value


class CandidateProfileResponse(_Base):
    city: str | None = None
    state_code: str | None = None
    updated_at: datetime | None = None


class RevealedCandidate(_Base):
    """One candidate's profile as an employer sees it after opening it (SRS 2.9.7).

    **A different schema from `MaskedCandidate`, on purpose** (invariant 7):
    the card cannot hold contact details, and this is the only employer
    response that can.

    **`score` is the display score, never `raw_value`** (R4). There is no
    field for the raw value, `extra="forbid"` refuses one, and an invariant
    test fails if any employer response grows one.

    `full_name` is present only when the candidate typed it on the structured
    form; a name is never guessed from a CV.
    """

    candidate_id: uuid.UUID
    full_name: Annotated[str | None, Field(default=None, max_length=200)] = None
    phone: str | None = None
    email: str | None = None
    score: int
    band: ScoreBand
    experience_years: Annotated[int, Field(ge=0, le=MAX_EXPERIENCE_YEARS)]
    skills: Annotated[list[str], Field(max_length=MAX_CARD_SKILLS)]
    badges: list[Badge]
    city: Annotated[str | None, Field(default=None, max_length=100)] = None
    state_code: Annotated[str | None, Field(default=None, min_length=2, max_length=2)] = None

    @field_validator("skills", mode="before")
    @classmethod
    def _only_displayable(cls, value: object) -> list[str]:
        if not isinstance(value, list | tuple):
            raise ValueError("skills must be a list")
        return displayable_skills(value)
