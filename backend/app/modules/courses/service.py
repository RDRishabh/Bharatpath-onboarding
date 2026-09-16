"""courses - business rules and transaction boundaries

Catalogue, purchase, completion, +30 contribution.

Services own the transaction. They never touch `Request`, and anything that
reveals private data writes its audit row on the same session before the
transaction closes.

**A purchase is recorded by billing, after a verified callback, and nowhere
else** (`record_purchase`). The database refuses a purchase row whose payment
is not verified, so there is no second way in.

**A completion moves a score (invariant 3), so it is written here and by no
route.** What completing the course means is not decided (blockers C1), there
is no recorded lesson to watch and no assessment bank to grade against. So
`record_completion` exists, is audited, emits the event scoring listens for,
and refuses any caller that is not the system or platform staff. **A candidate
cannot record their own completion**, and no endpoint lets anyone try. The
route lands with the assessment it would grade.

**This module imports nothing from `scoring`** (invariant 4'). Scoring reads
`contributions_for` when it computes a score.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Final

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditAction, audit_event
from app.core.deps import PLATFORM_ADMIN
from app.core.errors import ConflictError, NotFoundError, PermissionDeniedError
from app.core.errors import ValidationError as AppValidationError
from app.core.logging import get_logger
from app.core.outbox import emit
from app.modules.courses import repository
from app.modules.courses.catalogue import COURSE_CODE, COURSE_TITLE, HAS_MEDIA, missing_media
from app.modules.courses.domain import (
    MAX_COURSE_CONTRIBUTION,
    CourseProgress,
    clamp_contribution,
    evaluate_completion,
)
from app.modules.courses.events import COMPLETION_RECORDED
from app.modules.courses.models import Course, CourseCompletion
from app.modules.subscriptions.catalogue import COURSE_PRODUCT

logger = get_logger(__name__)

#: The actor role for writes the platform makes itself -- a graded assessment,
#: when one exists.
SYSTEM_ACTOR: Final = "SYSTEM"

#: Who may record a completion. Never CANDIDATE.
COMPLETION_WRITER_ROLES: Final = frozenset({SYSTEM_ACTOR, PLATFORM_ADMIN})


class CourseNotFoundError(NotFoundError):
    code = "course_not_found"
    title = "Course not found"


class CourseAlreadyPurchasedError(ConflictError):
    code = "course_already_purchased"
    title = "This course is already yours"


class CourseNotPurchasedError(ConflictError):
    code = "course_not_purchased"
    title = "This course has not been bought"


class CourseNotCompleteError(AppValidationError):
    """`params.reason` is the completion rule's code, e.g. `assessment_not_passed`."""

    code = "course_not_complete"
    title = "The course is not complete"


@dataclass(frozen=True, slots=True)
class CatalogueEntry:
    course: Course
    purchased: bool
    completed: bool


@dataclass(frozen=True, slots=True)
class CompletionResult:
    completion: CourseCompletion
    created: bool


@dataclass(frozen=True, slots=True)
class CourseContribution:
    """One completion as scoring folds it in."""

    completion_id: uuid.UUID
    course_id: uuid.UUID
    points: int
    contribution_version: str


async def list_catalogue(session: AsyncSession, *, user_id: uuid.UUID) -> list[CatalogueEntry]:
    """Active courses only. **The one course is inactive while its lessons are
    unrecorded** (`sync_catalogue`), so today this lists nothing -- which is
    correct: selling +30 points for watching nothing is the refund and the
    review `catalogue.HAS_MEDIA` exists to prevent."""
    courses = await repository.active_courses(session)
    purchased = await repository.purchased_course_ids(session, user_id=user_id)
    completed = await repository.completed_course_ids(session, user_id=user_id)
    return [CatalogueEntry(c, c.id in purchased, c.id in completed) for c in courses]


async def purchasable_course(
    session: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID
) -> Course:
    """An active course this user does not own. Purchasable once (client,
    2026-08-27), and the unique key on purchases holds that too."""
    course = await repository.get_course(session, course_id=course_id)
    if course is None or not course.active:
        raise CourseNotFoundError()
    if await repository.has_purchase(session, user_id=user_id, course_id=course_id):
        raise CourseAlreadyPurchasedError()
    return course


async def record_purchase(
    session: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID, payment_id: uuid.UUID
) -> bool:
    """Called by billing after a verified callback. False if already owned --
    a second verified payment for the same course grants nothing twice."""
    created = await repository.insert_purchase(
        session, user_id=user_id, course_id=course_id, payment_id=payment_id
    )
    if not created:
        logger.warning("course_purchase_already_recorded", course_id=str(course_id))
    return created


async def record_completion(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    progress: CourseProgress,
    actor_id: uuid.UUID | None,
    actor_role: str,
    request_id: str | None = None,
) -> CompletionResult:
    """**A score-moving write.** Role-restricted, purchase-gated, judged by the
    versioned completion rule, audited in this transaction, and announced to
    scoring through the outbox -- so a rolled-back completion never re-scores.

    Idempotent: a second call returns the recorded completion and writes, audits
    and emits nothing.
    """
    if actor_role not in COMPLETION_WRITER_ROLES:
        raise PermissionDeniedError(code="course_completion_not_writable")
    course = await repository.get_course(session, course_id=course_id)
    if course is None:
        raise CourseNotFoundError()
    if not await repository.has_purchase(session, user_id=user_id, course_id=course_id):
        raise CourseNotPurchasedError()

    existing = await repository.get_completion(session, user_id=user_id, course_id=course_id)
    if existing is not None:
        return CompletionResult(existing, created=False)

    decision = evaluate_completion(progress)
    if not decision.complete:
        raise CourseNotCompleteError(params={"reason": decision.reason})

    points = clamp_contribution(course.contribution_points)
    row = await repository.insert_completion(
        session,
        user_id=user_id,
        course_id=course_id,
        contribution_version=decision.rule_version,
        points_awarded=points,
    )
    if row is None:
        # Recorded by a concurrent call between the read and the insert.
        raced = await repository.get_completion(session, user_id=user_id, course_id=course_id)
        if raced is None:  # pragma: no cover - the conflict means it exists
            raise CourseNotPurchasedError()
        return CompletionResult(raced, created=False)

    await audit_event(
        session,
        action=AuditAction.COURSE_COMPLETION_RECORDED,
        actor_id=actor_id,
        actor_role=actor_role,
        target_type="course_completion",
        target_id=row.id,
        request_id=request_id,
        metadata={
            "candidate_id": str(user_id),
            "course_id": str(course_id),
            "points_awarded": points,
            "rule_version": decision.rule_version,
        },
    )
    await emit(
        session,
        event_type=COMPLETION_RECORDED,
        aggregate_type="course_completion",
        aggregate_id=row.id,
        payload={
            "user_id": str(user_id),
            "course_id": str(course_id),
            "completion_id": str(row.id),
            "points_awarded": points,
        },
    )
    logger.info("course_completion_recorded", course_id=str(course_id), points=points)
    return CompletionResult(row, created=True)


async def contributions_for(
    session: AsyncSession, *, user_id: uuid.UUID
) -> list[CourseContribution]:
    """Every completion this candidate has, at the points frozen on each."""
    return [
        CourseContribution(
            completion_id=row.id,
            course_id=row.course_id,
            points=clamp_contribution(row.points_awarded),
            contribution_version=row.contribution_version,
        )
        for row in await repository.completions_for(session, user_id=user_id)
    ]


async def sync_catalogue(session: AsyncSession) -> int:
    """Write the one course from `catalogue.py`. Returns the rows written.

    **Active only when every lesson has recorded media**, read from
    `missing_media()` rather than trusted from `HAS_MEDIA` alone, so a
    half-recorded course cannot be sold by flipping one flag. A change is a
    new version, never an edit, as for plans.
    """
    active = HAS_MEDIA and not missing_media()
    desired = (COURSE_TITLE, COURSE_PRODUCT.price_minor, MAX_COURSE_CONTRIBUTION, active)
    latest = await repository.latest_course_version(session, code=COURSE_CODE)
    if (
        latest is not None
        and (
            latest.title,
            latest.price_minor,
            latest.contribution_points,
            latest.active,
        )
        == desired
    ):
        return 0
    if latest is not None:
        latest.active = False
    await repository.insert_course(
        session,
        code=COURSE_CODE,
        title=COURSE_TITLE,
        price_minor=COURSE_PRODUCT.price_minor,
        contribution_points=MAX_COURSE_CONTRIBUTION,
        active=active,
        version=latest.version + 1 if latest is not None else 1,
    )
    return 1
