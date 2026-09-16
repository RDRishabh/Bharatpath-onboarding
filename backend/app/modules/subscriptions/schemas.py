"""subscriptions - Pydantic request/response DTOs

Plans, periods, renewal, cancellation, seats.

Separate Create / Update / Read schemas. ORM models are never exposed
directly - the schema IS the API contract, and for several modules it is also
where an invariant is enforced structurally.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


class PlanResponse(_Base):
    code: str
    audience: Literal["CANDIDATE", "EMPLOYER", "COLLEGE"]
    period: str
    months: int = Field(ge=1)
    price_minor: int = Field(ge=0, description="Paise.")
    currency: str = "INR"
    seat_allowance: int | None = None


class SubscriptionResponse(_Base):
    state: Literal["NONE", "PENDING", "ACTIVE", "GRACE", "LAPSED", "CANCELLED"] = Field(
        description="NONE: never subscribed. GRACE: the period ended while an automatic "
        "renewal is being retried; access continues until current_period_end."
    )
    has_access: bool = Field(description="Whether paid features are open right now.")
    plan_code: str | None = None
    period: str | None = None
    current_period_start: datetime | None = None
    current_period_end: datetime | None = Field(
        default=None, description="Access ends at this instant, unless renewed."
    )
    cancel_at: datetime | None = Field(
        default=None, description="Set when the subscriber cancelled: it will not renew."
    )
    renews_automatically: bool = False
    mandate_state: str | None = None


class SubscriptionCheckoutRequest(_Base):
    plan_code: str = Field(min_length=1, max_length=64)


class MandateResponse(_Base):
    state: str
    max_amount_minor: int = Field(
        gt=0, description="The most one renewal may debit. Fixed when registered."
    )
    valid_until: datetime | None = None
    authorisation_url: str = Field(description="Where the payer approves the mandate.")
