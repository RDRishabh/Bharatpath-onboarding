"""courses - HTTP layer

Catalogue, purchase, completion, +30 contribution.

Routes only. No business logic, no repository access.
import-linter enforces the second half of that sentence.

Pay-first (R13): a course is a tool, so the catalogue and checkout need an
active subscription. **There is no completion route** -- see
`courses/service.py` for why a completion is not something anyone can post.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status

from app.core.deps import (
    CANDIDATE,
    CurrentUser,
    DbSession,
    require_active_subscription,
    require_role,
)
from app.modules.billing import service as billing_service
from app.modules.billing.schemas import CheckoutResponse
from app.modules.courses import service
from app.modules.courses.schemas import CourseResponse

router = APIRouter()

PayingCandidate = [Depends(require_role(CANDIDATE)), Depends(require_active_subscription)]


@router.get(
    "",
    response_model=list[CourseResponse],
    dependencies=PayingCandidate,
    summary="Courses on sale, and which the candidate owns",
)
async def list_courses(user: CurrentUser, session: DbSession) -> list[CourseResponse]:
    entries = await service.list_catalogue(session, user_id=user.user_id)
    return [
        CourseResponse(
            id=entry.course.id,
            code=entry.course.code,
            title=entry.course.title,
            price_minor=entry.course.price_minor,
            purchased=entry.purchased,
            completed=entry.completed,
        )
        for entry in entries
    ]


@router.post(
    "/{course_id}/checkout",
    response_model=CheckoutResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=PayingCandidate,
    summary="Buy a course",
)
async def checkout_course(
    course_id: uuid.UUID, user: CurrentUser, session: DbSession
) -> CheckoutResponse:
    """Nothing is granted here; the purchase is recorded when the gateway's
    signed callback has been processed."""
    payment = await billing_service.checkout_course(
        session, user_id=user.user_id, course_id=course_id
    )
    return CheckoutResponse.of(payment)
