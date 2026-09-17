"""notifications - Pydantic request/response DTOs

Event to channel fan-out, templates.

Separate Create / Update / Read schemas. ORM models are never exposed
directly - the schema IS the API contract, and for several modules it is also
where an invariant is enforced structurally.

The inbox returns the rendered text in the reader's language at the time it
was written. The template code is included so a client can choose an icon or
a destination; it is not a translation key for the client to re-render.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.core.i18n import LOCALE_CODES

LocaleCode = Literal["en", "hi", "bn", "mr", "te", "ta", "gu", "kn"]
assert set(LocaleCode.__args__) == LOCALE_CODES  # type: ignore[attr-defined]


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


class InboxItem(_Base):
    id: uuid.UUID
    template_code: str
    body: str
    created_at: datetime
    read_at: datetime | None


class InboxPage(_Base):
    items: list[InboxItem]
    next_cursor: str | None
    unread: int


class PreferencesResponse(_Base):
    locale: str
    sms_enabled: bool
    email_enabled: bool
    push_enabled: bool
    #: Reminders to finish a profile. Turning these off stops them for good.
    nudges_enabled: bool


class UpdatePreferencesRequest(_Base):
    """Send only what changes. The in-app inbox cannot be turned off: it is
    where a message the law requires still reaches you."""

    locale: LocaleCode | None = None
    sms_enabled: bool | None = None
    email_enabled: bool | None = None
    push_enabled: bool | None = None
    nudges_enabled: bool | None = None


class SuppressRequest(_Base):
    channel: Literal["SMS", "EMAIL", "PUSH", "ALL"]
    reason: Literal["BOUNCED", "COMPLAINED", "SUPPORT_REQUEST"]


class SuppressResponse(_Base):
    user_id: uuid.UUID
    channel: str
    #: False when that channel was already suppressed.
    created: bool
