"""courses - data access

Catalogue, purchase, completion, +30 contribution.

All database access for this module lives here. Private to the module:
no other module may import it (import-linter contract `module-privacy`).

`course_completions` and `course_purchases` are append-only: an insert and
reads, nothing else, and the app role holds no UPDATE or DELETE on either.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.courses.models import Course, CourseCompletion, CoursePurchase


async def active_courses(session: AsyncSession) -> list[Course]:
    result = await session.execute(
        select(Course).where(Course.active.is_(True)).order_by(Course.code, Course.version.desc())
    )
    return list(result.scalars())


async def get_course(session: AsyncSession, *, course_id: uuid.UUID) -> Course | None:
    return await session.get(Course, course_id)


async def latest_course_version(session: AsyncSession, *, code: str) -> Course | None:
    result = await session.execute(
        select(Course).where(Course.code == code).order_by(Course.version.desc()).limit(1)
    )
    return result.scalar_one_or_none()


async def insert_course(
    session: AsyncSession,
    *,
    code: str,
    title: str,
    price_minor: int,
    contribution_points: int,
    active: bool,
    version: int,
) -> Course:
    row = Course(
        code=code,
        title=title,
        price_minor=price_minor,
        contribution_points=contribution_points,
        active=active,
        version=version,
    )
    session.add(row)
    await session.flush()
    return row


async def purchased_course_ids(session: AsyncSession, *, user_id: uuid.UUID) -> set[uuid.UUID]:
    result = await session.execute(
        select(CoursePurchase.course_id).where(CoursePurchase.user_id == user_id)
    )
    return set(result.scalars())


async def completed_course_ids(session: AsyncSession, *, user_id: uuid.UUID) -> set[uuid.UUID]:
    result = await session.execute(
        select(CourseCompletion.course_id).where(CourseCompletion.user_id == user_id)
    )
    return set(result.scalars())


async def has_purchase(session: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID) -> bool:
    result = await session.execute(
        select(CoursePurchase.id).where(
            CoursePurchase.user_id == user_id, CoursePurchase.course_id == course_id
        )
    )
    return result.first() is not None


async def insert_purchase(
    session: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID, payment_id: uuid.UUID
) -> bool:
    """False if this user already owns the course. The database guard refuses
    the insert outright unless `payment_id` is their verified payment for it."""
    result = await session.execute(
        pg_insert(CoursePurchase)
        .values(id=uuid.uuid4(), user_id=user_id, course_id=course_id, payment_id=payment_id)
        .on_conflict_do_nothing(constraint="uq_course_purchase_once")
        .returning(CoursePurchase.id)
    )
    return result.scalar_one_or_none() is not None


async def get_completion(
    session: AsyncSession, *, user_id: uuid.UUID, course_id: uuid.UUID
) -> CourseCompletion | None:
    result = await session.execute(
        select(CourseCompletion).where(
            CourseCompletion.user_id == user_id, CourseCompletion.course_id == course_id
        )
    )
    return result.scalar_one_or_none()


async def insert_completion(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    contribution_version: str,
    points_awarded: int,
) -> CourseCompletion | None:
    """**The only write path to `course_completions`.** None if already recorded."""
    result = await session.execute(
        pg_insert(CourseCompletion)
        .values(
            id=uuid.uuid4(),
            user_id=user_id,
            course_id=course_id,
            contribution_version=contribution_version,
            points_awarded=points_awarded,
        )
        .on_conflict_do_nothing(constraint="uq_course_completion_once")
        .returning(CourseCompletion.id)
    )
    completion_id = result.scalar_one_or_none()
    if completion_id is None:
        return None
    return await session.get(CourseCompletion, completion_id)


async def completions_for(session: AsyncSession, *, user_id: uuid.UUID) -> list[CourseCompletion]:
    result = await session.execute(
        select(CourseCompletion)
        .where(CourseCompletion.user_id == user_id)
        .order_by(CourseCompletion.completed_at, CourseCompletion.id)
    )
    return list(result.scalars())
