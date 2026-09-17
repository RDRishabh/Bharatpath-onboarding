"""notifications - HTTP layer

Event to channel fan-out, templates.

Routes only. No business logic, no repository access.
import-linter enforces the second half of that sentence.

**Every signed-in account has an inbox** -- candidate, employer, college and
staff alike -- and every route here reads only the caller's own messages and
settings. Nothing is paywalled: a lapsed subscriber must still be able to
read that their access ended, and to stop the reminders.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.modules.notifications import service
from app.modules.notifications.schemas import (
    InboxItem,
    InboxPage,
    PreferencesResponse,
    UpdatePreferencesRequest,
)

router = APIRouter()


@router.get("", response_model=InboxPage, summary="My in-app messages, newest first")
async def inbox(
    user: CurrentUser,
    session: DbSession,
    cursor: str | None = None,
    limit: int | None = Query(default=None, ge=1, le=100),
) -> InboxPage:
    return await service.inbox(session, ctx=user, cursor=cursor, limit=limit)


@router.get(
    "/preferences",
    response_model=PreferencesResponse,
    summary="My language and which channels may reach me",
)
async def get_preferences(user: CurrentUser, session: DbSession) -> PreferencesResponse:
    return await service.preferences(session, ctx=user)


@router.patch(
    "/preferences",
    response_model=PreferencesResponse,
    summary="Change my language or turn a channel off",
)
async def update_preferences(
    payload: UpdatePreferencesRequest, user: CurrentUser, session: DbSession
) -> PreferencesResponse:
    """A UPI pre-debit notice is still sent by SMS with SMS turned off: the
    law requires it before every automatic debit. Nothing else is."""
    return await service.update_preferences(
        session, ctx=user, changes=payload.model_dump(exclude_unset=True)
    )


@router.post(
    "/{notification_id}/read",
    response_model=InboxItem,
    summary="Mark one of my messages read",
)
async def mark_read(notification_id: uuid.UUID, user: CurrentUser, session: DbSession) -> InboxItem:
    return await service.mark_read(session, ctx=user, notification_id=notification_id)
