"""employer - Pydantic request/response DTOs

Employer tenant, team members, roles.

Separate Create / Update / Read schemas. ORM models are never exposed
directly - the schema IS the API contract, and for several modules it is also
where an invariant is enforced structurally.

**No request here carries a tenant id.** The organisation a caller acts on is
their resolved membership, never a value they send (SRS 2.24.7).
`extra="forbid"` makes a smuggled `tenant_id` a 422 rather than a field that
is silently ignored today and silently honoured by a later refactor.
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Annotated, Final, Literal

from pydantic import Field, field_validator, model_validator

from app.core.schemas import ApiSchema
from app.modules.employer.reference import active_employer_types, active_industries

EmployerRole = Literal["EMPLOYER_OWNER", "EMPLOYER_RECRUITER", "EMPLOYER_VIEWER"]

#: Only codes that can still be chosen. `reference.is_valid_*` also accepts
#: retired codes, which is right for rows that already hold one and wrong for
#: a new choice -- a retired industry must not be picked by anyone new.
_ACTIVE_TYPES: Final[frozenset[str]] = frozenset(t.code for t in active_employer_types())
_ACTIVE_INDUSTRIES: Final[frozenset[str]] = frozenset(t.code for t in active_industries())

#: Deliberately loose. The authority on whether an address works is the
#: person receiving the invitation; this only refuses what is obviously not
#: an address, without pulling in a validation dependency.
_EMAIL: Final = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class _Base(ApiSchema):
    """Every schema in this module. `ApiSchema` strips the control
    characters Postgres cannot store -- see `app/core/schemas.py`."""


def _employer_type(value: str | None) -> str | None:
    if value is not None and value not in _ACTIVE_TYPES:
        raise ValueError("not an employer type that can be chosen")
    return value


def _industry(value: str | None) -> str | None:
    if value is not None and value not in _ACTIVE_INDUSTRIES:
        raise ValueError("not an industry that can be chosen")
    return value


def _legal_name(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(value.split())
    if len(cleaned) < 2:
        raise ValueError("too short once whitespace is removed")
    return cleaned


# ---------------------------------------------------------------------------
# The organisation
# ---------------------------------------------------------------------------
class CreateOrganisationRequest(_Base):
    """Type and industry are closed lists (`reference.py`), not free text:
    candidates filter on them, and free text makes "IT", "I.T." and
    "Information Technology" three different industries forever."""

    legal_name: Annotated[str, Field(min_length=2, max_length=255)]
    employer_type: str | None = None
    industry: str | None = None

    _name = field_validator("legal_name")(_legal_name)
    _type = field_validator("employer_type")(_employer_type)
    _ind = field_validator("industry")(_industry)


class UpdateOrganisationRequest(_Base):
    """A partial update. A field left out is unchanged; `employer_type` or
    `industry` sent as null clears it. `legal_name` cannot be cleared."""

    legal_name: Annotated[str | None, Field(default=None, max_length=255)] = None
    employer_type: str | None = None
    industry: str | None = None

    _type = field_validator("employer_type")(_employer_type)
    _ind = field_validator("industry")(_industry)

    @field_validator("legal_name")
    @classmethod
    def _name(cls, value: str | None) -> str | None:
        if value is None:
            raise ValueError("an organisation cannot have no name")
        return _legal_name(value)

    @model_validator(mode="after")
    def _something(self) -> UpdateOrganisationRequest:
        if not self.model_fields_set:
            raise ValueError("send at least one field to change")
        return self


class OrganisationResponse(_Base):
    tenant_id: uuid.UUID
    legal_name: str
    employer_type: str | None = None
    industry: str | None = None
    kyb_status: str = Field(
        description="DRAFT until KYB is submitted (Day 10). An organisation "
        "exists before it is verified; publishing a job does not."
    )


class TermResponse(_Base):
    code: str
    label: str


class ReferenceResponse(_Base):
    """What the organisation form's dropdowns offer. Active terms only."""

    employer_types: list[TermResponse]
    industries: list[TermResponse]


# ---------------------------------------------------------------------------
# The team
# ---------------------------------------------------------------------------
class TeamMemberResponse(_Base):
    user_id: uuid.UUID
    email: str | None = None
    role: EmployerRole
    added_at: datetime


class AddTeamMemberRequest(_Base):
    email: Annotated[str, Field(max_length=320)]
    role: EmployerRole

    @field_validator("email")
    @classmethod
    def _address(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not _EMAIL.match(cleaned):
            raise ValueError("not an email address")
        return cleaned


class ChangeRoleRequest(_Base):
    role: EmployerRole
