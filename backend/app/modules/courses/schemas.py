"""courses - Pydantic request/response DTOs

Catalogue, purchase, completion, +30 contribution.

Separate Create / Update / Read schemas. ORM models are never exposed
directly - the schema IS the API contract, and for several modules it is also
where an invariant is enforced structurally.

**No field says what a course is worth to the score.** The score is never
explained (R11), and a price beside a points figure is the "points for sale"
reading the course pricing note in `subscriptions/catalogue.py` warns about.
How the app describes the course is copy for the client to approve.
"""

from __future__ import annotations

import uuid

from pydantic import Field

from app.core.schemas import ApiSchema


class _Base(ApiSchema):
    """Every schema in this module. `ApiSchema` strips the control
    characters Postgres cannot store -- see `app/core/schemas.py`."""


class CourseResponse(_Base):
    id: uuid.UUID
    code: str
    title: str
    price_minor: int = Field(ge=0, description="Paise.")
    currency: str = "INR"
    purchased: bool
    completed: bool
