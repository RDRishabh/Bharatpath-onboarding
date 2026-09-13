"""integrity - data access

Signals, severity policy, search suppression.

All database access for this module lives here. Private to the module:
no other module may import it (import-linter contract `module-privacy`).

Discovery reads these tables too, but with a SQL predicate rather than by
importing this file -- see `discovery/repository.py` for why the suppression
filter has to live inside the discovery query itself.
"""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.models import ConfigValue
from app.modules.integrity.domain import Signal
from app.modules.integrity.models import IntegrityCheck, IntegritySignal


async def claim_check(
    session: AsyncSession,
    *,
    candidate_id: uuid.UUID,
    resume_version_id: uuid.UUID,
    rule_version: str,
    thresholds_version: str,
    highest_severity: str | None,
    signal_count: int,
) -> bool:
    """Record that a version was checked. False if it already had been.

    **Written before the signals, as the idempotency claim.** The outbox
    delivers at least once, so the same score event arrives twice; the second
    delivery finds the unique key taken and inserts nothing -- no duplicate
    check row, and therefore no duplicate signals in a reviewer's queue.
    """
    result = await session.execute(
        pg_insert(IntegrityCheck)
        .values(
            id=uuid.uuid4(),
            candidate_id=candidate_id,
            resume_version_id=resume_version_id,
            rule_version=rule_version,
            thresholds_version=thresholds_version,
            highest_severity=highest_severity,
            signal_count=signal_count,
        )
        .on_conflict_do_nothing(constraint="uq_integrity_checks_version_rule")
        .returning(IntegrityCheck.id)
    )
    return result.scalar_one_or_none() is not None


async def get_check(
    session: AsyncSession, *, resume_version_id: uuid.UUID, rule_version: str
) -> IntegrityCheck | None:
    result = await session.execute(
        select(IntegrityCheck).where(
            IntegrityCheck.resume_version_id == resume_version_id,
            IntegrityCheck.rule_version == rule_version,
        )
    )
    return result.scalar_one_or_none()


async def insert_signals(
    session: AsyncSession,
    *,
    candidate_id: uuid.UUID,
    resume_version_id: uuid.UUID,
    signals: Sequence[Signal],
    thresholds_version: str,
) -> None:
    """Every signal is stored with the rule version that raised it, so a
    reviewer looking at a two-month-old item knows which rule fired."""
    if not signals:
        return
    session.add_all(
        [
            IntegritySignal(
                candidate_id=candidate_id,
                resume_version_id=resume_version_id,
                rule_id=signal.rule_id,
                rule_version=signal.rule_version,
                thresholds_version=thresholds_version,
                severity=signal.severity,
                evidence=dict(signal.evidence),
                state="OPEN",
            )
            for signal in signals
        ]
    )
    await session.flush()


async def signals_for_version(
    session: AsyncSession, *, resume_version_id: uuid.UUID
) -> list[IntegritySignal]:
    result = await session.execute(
        select(IntegritySignal)
        .where(IntegritySignal.resume_version_id == resume_version_id)
        .order_by(IntegritySignal.created_at, IntegritySignal.id)
    )
    return list(result.scalars().all())


async def get_signal(session: AsyncSession, *, signal_id: uuid.UUID) -> IntegritySignal | None:
    return await session.get(IntegritySignal, signal_id)


async def resolve_signal(
    session: AsyncSession,
    *,
    signal_id: uuid.UUID,
    state: str,
    resolved_by: uuid.UUID,
    note: str | None,
) -> IntegritySignal | None:
    """Close an OPEN signal. None if it was not open.

    A conditional UPDATE, for the same reason `confirm_version` is one: two
    reviewers acting on one queue item must not both win, and a decision once
    taken is not silently replaced by a second one.
    """
    result = await session.execute(
        update(IntegritySignal)
        .where(IntegritySignal.id == signal_id, IntegritySignal.state == "OPEN")
        .values(
            state=state,
            resolved_by=resolved_by,
            resolved_at=func.now(),
            resolution_note=note,
        )
        .returning(IntegritySignal)
    )
    return result.scalar_one_or_none()


async def current_config(session: AsyncSession, *, key: str, now: datetime) -> ConfigValue | None:
    """The highest version of a config key in effect at `now`.

    `now` is the moment the CV was scored, not the moment this runs, so
    re-evaluating an old version applies the thresholds that were in force
    then -- the same reason `evaluate_version` takes `as_of`.
    """
    result = await session.execute(
        select(ConfigValue)
        .where(ConfigValue.key == key, ConfigValue.effective_from <= now)
        .order_by(ConfigValue.version.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
