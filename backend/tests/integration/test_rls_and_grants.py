"""The Week 1 gate, proven against a real Postgres.

Never SQLite. RLS, `SET LOCAL`, partial indexes and JSONB all behave
differently there, and those are precisely what these tests exercise - a
green run against SQLite would prove nothing at all.

These are skipped when no database is reachable, so a laptop without Docker
can still run the rest of the suite. **CI has Postgres and must not skip
them** - `test_database_is_actually_available` fails loudly if the CI marker
is set and the database is missing, so a silent skip cannot masquerade as a
pass.
"""

from __future__ import annotations

import os
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]

APP_URL = os.getenv("DATABASE_URL_APP") or os.getenv("DATABASE_URL", "")
MIGRATOR_URL = os.getenv("DATABASE_URL_MIGRATOR") or APP_URL
IN_CI = os.getenv("CI") == "true"


def _sessions(url: str) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(create_async_engine(url), expire_on_commit=False)


async def _db_reachable(url: str) -> bool:
    if not url:
        return False
    try:
        engine = create_async_engine(url)
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        await engine.dispose()
        return True
    except Exception:
        return False


@pytest.fixture(scope="module", autouse=True)
async def _require_db() -> None:
    if not await _db_reachable(APP_URL):
        if IN_CI:
            pytest.fail(
                "CI must run these against a real Postgres. A skip here would "
                "let the tenant-isolation and append-only guarantees go "
                "unverified while the build still went green."
            )
        pytest.skip("no database reachable - start docker compose up -d postgres")


# ---------------------------------------------------------------------------
# INVARIANT 7 / SRS 2.24.7 - tenant isolation
# ---------------------------------------------------------------------------


async def test_unset_tenant_returns_no_rows_not_all_rows() -> None:
    """Forgetting to set the tenant must fail CLOSED.

    This is the single most important property of the RLS design. The policy
    compares against `current_setting('app.tenant_id', true)`, which is NULL
    when unset; a NULL comparison matches nothing. The failure mode of a
    forgotten `SET LOCAL` is therefore an empty result, not the whole table.
    """
    async with _sessions(APP_URL)() as session, session.begin():
        rows = (await session.execute(text("SELECT count(*) FROM jobs"))).scalar_one()
        assert rows == 0, (
            "RLS is not filtering with app.tenant_id unset. Either the policy "
            "is missing, or the application role owns the tables / holds "
            "BYPASSRLS - in which case RLS is doing nothing at all."
        )


async def test_tenant_a_cannot_see_tenant_b(seeded_tenants) -> None:
    """The core cross-tenant assertion, at the database layer."""
    tenant_a, tenant_b = seeded_tenants

    async with _sessions(APP_URL)() as session, session.begin():
        await session.execute(text("SET LOCAL app.tenant_id = :t"), {"t": str(tenant_a)})
        visible = (await session.execute(text("SELECT tenant_id FROM jobs"))).scalars().all()

    assert all(str(t) == str(tenant_a) for t in visible)
    assert str(tenant_b) not in [str(t) for t in visible]


async def test_set_local_does_not_leak_across_transactions(seeded_tenants) -> None:
    """`SET LOCAL` dies with its transaction.

    This is why the session dependency uses SET LOCAL rather than SET: a
    pooled connection must not carry one request's tenancy into the next
    request that happens to reuse it.
    """
    tenant_a, _ = seeded_tenants
    factory = _sessions(APP_URL)

    async with factory() as session, session.begin():
        await session.execute(text("SET LOCAL app.tenant_id = :t"), {"t": str(tenant_a)})

    async with factory() as session, session.begin():
        setting = (
            await session.execute(text("SELECT current_setting('app.tenant_id', true)"))
        ).scalar_one()
        assert setting in (None, ""), "tenant setting survived its transaction"


# ---------------------------------------------------------------------------
# INVARIANT 7' / PRD rule 9 - the audit trail is append-only
# ---------------------------------------------------------------------------


async def test_audit_events_cannot_be_updated_or_deleted() -> None:
    """Revoked at the role level, so even a bug cannot rewrite history."""
    factory = _sessions(APP_URL)

    for statement in (
        "UPDATE audit_events SET action = 'tampered'",
        "DELETE FROM audit_events",
    ):
        async with factory() as session, session.begin():
            with pytest.raises((ProgrammingError, DBAPIError)) as exc:
                await session.execute(text(statement))
            assert "permission denied" in str(exc.value).lower(), (
                f"{statement!r} was not refused by the database"
            )


# ---------------------------------------------------------------------------
# INVARIANT 3 - the score is never human-editable
# ---------------------------------------------------------------------------


async def test_scores_are_insert_only() -> None:
    """No route accepts a score, and the database will not accept one either.

    "Score history" is every row of this table. Nothing is ever mutated, so an
    old score can always be replayed and compared.
    """
    factory = _sessions(APP_URL)

    for statement in (
        "UPDATE scores SET raw_value = 990",
        "DELETE FROM scores",
    ):
        async with factory() as session, session.begin():
            with pytest.raises((ProgrammingError, DBAPIError)) as exc:
                await session.execute(text(statement))
            assert "permission denied" in str(exc.value).lower()


async def test_score_range_is_enforced_by_the_database() -> None:
    """INVARIANT 2. 700-990, checked below the application."""
    async with _sessions(MIGRATOR_URL)() as session, session.begin():
        with pytest.raises((DBAPIError, ProgrammingError)):
            await session.execute(
                text(
                    "INSERT INTO scores (id, user_id, resume_version_id, "
                    "algorithm_version, raw_value, base_value, addon_value, "
                    "contribution_version) VALUES (gen_random_uuid(), "
                    "gen_random_uuid(), gen_random_uuid(), 'v0', 1200, 900, 90, 'v1')"
                )
            )


# ---------------------------------------------------------------------------
# INVARIANT 8 - no publish before KYB, below the service layer
# ---------------------------------------------------------------------------


async def test_publish_gate_fires_on_a_direct_insert(seeded_tenants) -> None:
    """The test bypasses the API *and* the service and must still fail.

    A gate that lives only in application code is a gate a future refactor can
    route around. This one is a Postgres trigger.
    """
    tenant_a, _ = seeded_tenants

    async with _sessions(MIGRATOR_URL)() as session, session.begin():
        await session.execute(
            text("UPDATE employers SET kyb_status = 'DRAFT' WHERE tenant_id = :t"),
            {"t": str(tenant_a)},
        )
        with pytest.raises((DBAPIError, ProgrammingError)) as exc:
            await session.execute(
                text(
                    "INSERT INTO jobs (id, tenant_id, title, description, "
                    "salary_min_minor, salary_max_minor, status) "
                    "VALUES (gen_random_uuid(), :t, 'x', 'y', 100, 200, 'PUBLISHED')"
                ),
                {"t": str(tenant_a)},
            )
        assert "KYB_REQUIRED" in str(exc.value)


# ---------------------------------------------------------------------------
# Duplicate application prevention - a constraint, not a race
# ---------------------------------------------------------------------------


async def test_duplicate_active_application_is_refused(seeded_tenants) -> None:
    """Not to be confused with the duplicate-CV rule the client dropped.

    This is a partial unique index, it is a different mechanism entirely, and
    it stays.
    """
    tenant_a, _ = seeded_tenants
    job_id, candidate_id = uuid.uuid4(), uuid.uuid4()

    async with _sessions(MIGRATOR_URL)() as session, session.begin():
        await session.execute(
            text(
                "INSERT INTO users (id, pool, phone, status, locale) "
                "VALUES (:u, 'CANDIDATE', :p, 'ACTIVE', 'en')"
            ),
            {"u": str(candidate_id), "p": f"+9198{uuid.uuid4().int % 10**8:08d}"},
        )
        await session.execute(
            text("UPDATE employers SET kyb_status = 'APPROVED' WHERE tenant_id = :t"),
            {"t": str(tenant_a)},
        )
        await session.execute(
            text(
                "INSERT INTO jobs (id, tenant_id, title, description, "
                "salary_min_minor, salary_max_minor, status) "
                "VALUES (:j, :t, 'x', 'y', 100, 200, 'PUBLISHED')"
            ),
            {"j": str(job_id), "t": str(tenant_a)},
        )

        insert_application = text(
            "INSERT INTO applications (id, tenant_id, job_id, candidate_id, stage) "
            "VALUES (gen_random_uuid(), :t, :j, :c, 'SUBMITTED')"
        )
        params = {"t": str(tenant_a), "j": str(job_id), "c": str(candidate_id)}
        await session.execute(insert_application, params)

        with pytest.raises((DBAPIError, ProgrammingError)):
            await session.execute(insert_application, params)
