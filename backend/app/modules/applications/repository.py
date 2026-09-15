"""applications - data access

Apply, stages, withdraw, expiry, hire confirm.

All database access for this module lives here. Private to the module:
no other module may import it (import-linter contract `module-privacy`).

**`applications` is under Row-Level Security twice over.** Employers read it
through the tenant policy, with `app.tenant_id` bound by the service;
candidates through the candidate policies, with `app.user_id` bound. The
`tenant_id` and `candidate_id` predicates here are belt and braces on top of
those, not instead of them.

**`application_events` is not under RLS** -- it has no tenant column. It is
only ever read by application id, for an application the caller has already
been shown under the policies above.

**The stage machine is not enforced here, and cannot be bypassed from here.**
`save` writes what it is given; `guard_application_write` refuses a transition
the pipeline does not allow on the flush.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import insert, literal, or_, select, tuple_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.models import ConfigValue
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
        stmt = stmt.with_for_update().execution_options(populate_existing=True)
    return (await session.execute(stmt)).scalar_one_or_none()


async def get_for_tenant(
    session: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    application_id: uuid.UUID,
    for_update: bool = False,
) -> Application | None:
    """One application in the tenant's pipeline.

    `populate_existing` with the lock: a row read a moment earlier in this
    session is already in the identity map, and without it the locked read
    would hand back those stale attributes rather than what the lock waited
    for.
    """
    stmt = select(Application).where(
        Application.id == application_id, Application.tenant_id == tenant_id
    )
    if for_update:
        stmt = stmt.with_for_update().execution_options(populate_existing=True)
    return (await session.execute(stmt)).scalar_one_or_none()


def _keyset(after: tuple[datetime, uuid.UUID], *, descending: bool) -> Any:
    left = tuple_(Application.created_at, Application.id)
    right = tuple_(
        literal(after[0], Application.created_at.type), literal(after[1], Application.id.type)
    )
    return left < right if descending else left > right


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
        stmt = stmt.where(_keyset(after, descending=True))
    result = await session.execute(
        stmt.order_by(Application.created_at.desc(), Application.id.desc()).limit(limit)
    )
    return list(result.scalars().all())


async def list_for_job(
    session: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    job_id: uuid.UUID,
    stage: str | None,
    after: tuple[datetime, uuid.UUID] | None,
    limit: int,
) -> list[Application]:
    """**Oldest first**, unlike the candidate's board: a pipeline is worked in
    the order people applied, and the oldest are the ones nearest expiry.
    `ix_applications_job_stage`."""
    stmt = select(Application).where(
        Application.tenant_id == tenant_id, Application.job_id == job_id
    )
    if stage is not None:
        stmt = stmt.where(Application.stage == stage)
    if after is not None:
        stmt = stmt.where(_keyset(after, descending=False))
    result = await session.execute(
        stmt.order_by(Application.created_at.asc(), Application.id.asc()).limit(limit)
    )
    return list(result.scalars().all())


async def save(session: AsyncSession, *, application: Application, **changes: Any) -> Application:
    """Write `changes` in one UPDATE. The database guard judges it on the flush.

    One call is one statement, which matters twice: confirming a hire sets the
    confirmation and HIRED together, because the CHECK refuses either alone;
    and a two-stage move is two calls, because the guard sees each step.
    """
    for field, value in changes.items():
        setattr(application, field, value)
    await session.flush()
    await session.refresh(application, attribute_names=["updated_at"])
    return application


async def record_event(
    session: AsyncSession,
    *,
    application_id: uuid.UUID,
    from_stage: str | None,
    to_stage: str,
    actor_type: str,
    actor_id: uuid.UUID | None,
    kind: str = "STAGE_CHANGED",
    note: str | None = None,
) -> None:
    """Append one event. `application_events` has no UPDATE or DELETE grant."""
    await session.execute(
        insert(ApplicationEvent).values(
            id=uuid.uuid4(),
            application_id=application_id,
            kind=kind,
            from_stage=from_stage,
            to_stage=to_stage,
            actor_type=actor_type,
            actor_id=actor_id,
            note=note,
        )
    )


async def events_for(session: AsyncSession, *, application_id: uuid.UUID) -> list[ApplicationEvent]:
    result = await session.execute(
        select(ApplicationEvent)
        .where(ApplicationEvent.application_id == application_id)
        .order_by(ApplicationEvent.occurred_at.asc(), ApplicationEvent.id.asc())
    )
    return list(result.scalars().all())


async def lock_expirable(
    session: AsyncSession, *, tenant_id: uuid.UUID, cutoff: datetime, limit: int
) -> list[Application]:
    """Open applications in one tenant whose employer has been quiet since `cutoff`.

    The index-assisted half of `domain.expires`; the service re-checks each row
    against the rule itself. **`SKIP LOCKED`**: a row an employer is moving
    right now is left for the next sweep rather than waited on, and when that
    employer commits it is no longer quiet.
    """
    result = await session.execute(
        select(Application)
        .where(
            Application.tenant_id == tenant_id,
            Application.stage.not_in(TERMINAL_STAGES),
            Application.employer_confirmed_at.is_(None),
            Application.employer_active_at < cutoff,
            or_(Application.interview_at.is_(None), Application.interview_at < cutoff),
        )
        .order_by(Application.employer_active_at.asc())
        .limit(limit)
        .with_for_update(skip_locked=True)
    )
    return list(result.scalars().all())


async def current_config(session: AsyncSession, *, key: str, now: datetime) -> ConfigValue | None:
    """The highest version of a config key in effect at `now`."""
    result = await session.execute(
        select(ConfigValue)
        .where(ConfigValue.key == key, ConfigValue.effective_from <= now)
        .order_by(ConfigValue.version.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
