"""discovery - Pydantic request/response DTOs

Masked search, access-window checks, reveal audit.

Separate Create / Update / Read schemas. ORM models are never exposed
directly - the schema IS the API contract, and for several modules it is also
where an invariant is enforced structurally.

**`MaskedCandidate` is structurally incapable of holding a name, a phone
number, an email or the score** (plan.md Day 13). Not "does not populate" --
there is no field to put them in, `extra="forbid"` refuses one arriving, and
no field is free-form. `tests/invariants/test_masked_candidate.py` holds the
field list, so widening the card is a visible change to a test.
"""

from __future__ import annotations

import uuid
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.discovery.domain import (
    MAX_CARD_SKILLS,
    MAX_EXPERIENCE_YEARS,
    displayable_skills,
    looks_like_contact,
)

#: The four bands, in ascending order. The same labels as
#: `scoring.domain.BANDS`, which `discovery` may not import; an invariant test
#: fails if the two lists part company.
ScoreBand = Literal["ENTRY", "DEVELOPING", "SOLID", "STRONG"]

#: `domain.BADGE_FOR_ADDON_KIND`'s values, held equal by the same test.
Badge = Literal["COURSE_COMPLETED", "MOCK_INTERVIEW_COMPLETED"]


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


class MaskedCandidate(_Base):
    """One anonymised candidate card (SRS 2.9.6).

    **The band, never the score.** Employers never see the raw number (R4,
    2026-08-24), and the band is what the design system draws.

    `candidate_id` is the handle the Day 14 reveal opens, behind the access
    window and its audit row. It is already what the employer pipeline shows
    for an applicant, so a card names no one the pipeline would not.
    """

    candidate_id: uuid.UUID
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

    @field_validator("city")
    @classmethod
    def _never_contact_data(cls, value: str | None) -> str | None:
        # The candidate module refuses such a city on the way in. This is the
        # second lock, for a row that reached the table some other way.
        return None if value is not None and looks_like_contact(value) else value
