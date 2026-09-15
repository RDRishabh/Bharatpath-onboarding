"""candidate - Pydantic request/response DTOs

Candidate profile, settings, language preference.

Separate Create / Update / Read schemas. ORM models are never exposed
directly - the schema IS the API contract, and for several modules it is also
where an invariant is enforced structurally.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.candidate.domain import MAX_CITY_LENGTH, STATE_CODES, normalise_city


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
