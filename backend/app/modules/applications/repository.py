"""applications - data access

Apply, stages, withdraw, expiry, hire confirm.

All database access for this module lives here. Private to the module:
no other module may import it (import-linter contract `module-privacy`).

**`applications` is under Row-Level Security twice over.** Employers read it
through the tenant policy (Day 12); candidates through the candidate policies,
with `app.user_id` bound by the service. The `candidate_id` predicates here are
belt and braces on top of those, not instead of them.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import insert, literal, select, tuple_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.applications.domain import TERMINAL_STAGES
from app.modules.applications.models import Application, ApplicationEvent


async def insert_if_absent(
    session: AsyncSession, *, tenant_id: uuid.UUID, job_id: uuid.UUID, candidate_id: uuid.UUID
) -> uuid.UUID | None:
    """Create a SUBMITTED application, or do nothing if one is already active.

    Returns the new id, or None when `uq_application_active` said no. **The
    index is the duplicate check, not a read before the write**: two
    simultaneous applies both see no application, and only the index can make
    one of them lose. `ON CONFLICT DO NOTHING` turns that loss into an
    ordinary outcome rather than an exception that aborts the transaction.
    """
    result = await session.execute(
        pg_insert(Application)
        .values(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            job_id=job_id,
            candidate_id=candidate_id,
            stage="SUBMITTED",
        )
        .on_conflict_do_nothing()
        .returning(Application.id)
    )
    return result.scalar_one_or_none()


async def active_for(
    session: AsyncSession, *, job_id: uuid.UUID, candidate_id: uuid.UUID
) -> Application | None:
    result = await session.execute(
        select(Application).where(
            Application.job_id == job_id,
            Application.candidate_id == candidate_id,
            Application.stage.not_in(TERMINAL_STAGES),
        )
    )
    return result.scalar_one_or_none()


async def get_for_candidate(
    session: AsyncSession,
    *,
    application_id: uuid.UUID,
    candidate_id: uuid.UUID,
    for_update: bool = False,
) -> Application | None:
    stmt = select(Application).where(
        Application.id == application_id, Application.candidate_id == candidate_id
    )
    if for_update:
        stmt = stmt.with_for_update()
    return (await session.execute(stmt)).scalar_one_or_none()


async def list_for_candidate(
    session: AsyncSession,
    *,
    candidate_id: uuid.UUID,
    after: tuple[datetime, uuid.UUID] | None,
    limit: int,
) -> list[Application]:
    """Newest first, keyset-paginated on `(created_at, id)`; `ix_applications_candidate`."""
    stmt = select(Application).where(Application.candidate_id == candidate_id)
    if after is not None:
        stmt = stmt.where(
            tuple_(Application.created_at, Application.id)
            < tuple_(
                literal(after[0], Application.created_at.type),
                literal(after[1], Application.id.type),
            )
        )
    result = await session.execute(
        stmt.order_by(Application.created_at.desc(), Application.id.desc()).limit(limit)
    )
    return list(result.scalars().all())


async def set_stage(session: AsyncSession, *, application: Application, stage: str) -> Application:
    application.stage = stage
    await session.flush()
    await session.refresh(application, attribute_names=["updated_at"])
    return application


async def record_event(
    session: AsyncSession,
    *,
    application_id: uuid.UUID,
    from_stage: str | None,
    to_stage: str,
    actor_id: uuid.UUID,
) -> None:
    """Append one transition. `application_events` has no UPDATE or DELETE grant."""
    await session.execute(
        insert(ApplicationEvent).values(
            id=uuid.uuid4(),
            application_id=application_id,
            from_stage=from_stage,
            to_stage=to_stage,
            actor_id=actor_id,
        )
    )
