"""Shared fixtures.

Integration tests use a real Postgres via docker-compose (locally) or the CI
service container. Never SQLite: RLS, JSONB, partial indexes and `SET LOCAL`
all behave differently there, and those are exactly what the tests exercise.
"""

from __future__ import annotations

import os
import uuid
from collections.abc import AsyncIterator

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

os.environ.setdefault(
    "DATABASE_URL", "postgresql+asyncpg://bharatpath:bharatpath@localhost:5432/bharatpath"
)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("ENVIRONMENT", "local")


@pytest.fixture(scope="session")
def app():
    from app.main import create_app

    return create_app()


@pytest.fixture
async def client(app) -> AsyncIterator[object]:
    from httpx import ASGITransport, AsyncClient

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


def _seed_url() -> str:
    """The connection used to create test data.

    **Deliberately the BYPASSRLS admin role, not the migrator.**

    `FORCE ROW LEVEL SECURITY` means the policy applies to the table OWNER
    too - which is the whole reason FORCE is there. So seeding as the migrator
    (the owner) with no `app.tenant_id` set fails the policy's WITH CHECK
    clause and nothing can be inserted. Only BYPASSRLS gets past FORCE, and
    that is exactly what the admin role exists for.

    Seeding through bypass and then READING through the app role is also the
    shape production has: privileged writes, tenant-scoped reads.
    """
    return (
        os.getenv("DATABASE_ADMIN_URL")
        or os.getenv("DATABASE_URL_MIGRATOR")
        or os.getenv("DATABASE_URL", "")
    )


def sessions(url: str) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(create_async_engine(url), expire_on_commit=False)


@pytest.fixture
async def seeded_tenants() -> AsyncIterator[tuple[uuid.UUID, uuid.UUID]]:
    """Two employer tenants, each with an approved employer and a live job.

    Function-scoped on purpose. A module-scoped async fixture needs its event
    loop scope to match under pytest-asyncio, which is a footgun for no gain
    here - seeding four rows costs microseconds and per-test isolation means
    one failing test cannot leave state that breaks the next.
    """
    engine = create_async_engine(_seed_url())
    factory = async_sessionmaker(engine, expire_on_commit=False)

    tenant_a, tenant_b = uuid.uuid4(), uuid.uuid4()

    async with factory() as session, session.begin():
        for tenant_id, name in ((tenant_a, "Tenant A"), (tenant_b, "Tenant B")):
            await session.execute(
                text(
                    "INSERT INTO tenants (id, type, name, status) "
                    "VALUES (:i, 'EMPLOYER', :n, 'ACTIVE')"
                ),
                {"i": str(tenant_id), "n": name},
            )
            await session.execute(
                text(
                    "INSERT INTO employers (tenant_id, legal_name, kyb_status) "
                    "VALUES (:i, :n, 'APPROVED')"
                ),
                {"i": str(tenant_id), "n": name},
            )
            await session.execute(
                text(
                    "INSERT INTO jobs (id, tenant_id, title, description, "
                    "salary_min_minor, salary_max_minor, status) "
                    "VALUES (gen_random_uuid(), :i, 'Role', 'Desc', "
                    "1000000, 2000000, 'PUBLISHED')"
                ),
                {"i": str(tenant_id)},
            )

    yield tenant_a, tenant_b

    async with factory() as session, session.begin():
        await session.execute(
            text("DELETE FROM tenants WHERE id = ANY(:ids)"),
            {"ids": [str(tenant_a), str(tenant_b)]},
        )
    await engine.dispose()


@pytest.fixture
async def seeded_candidate() -> AsyncIterator[tuple[uuid.UUID, uuid.UUID]]:
    """One candidate with a confirmed resume version, for score tests."""
    engine = create_async_engine(_seed_url())
    factory = async_sessionmaker(engine, expire_on_commit=False)

    user_id, version_id = uuid.uuid4(), uuid.uuid4()

    async with factory() as session, session.begin():
        await session.execute(
            text(
                "INSERT INTO users (id, pool, phone, status, locale) "
                "VALUES (:u, 'CANDIDATE', :p, 'ACTIVE', 'en')"
            ),
            {"u": str(user_id), "p": f"+9199{uuid.uuid4().int % 10**8:08d}"},
        )
        await session.execute(
            text(
                "INSERT INTO resume_versions (id, user_id, source, parsed, "
                "confirmed_at) VALUES (:v, :u, 'UPLOAD', '{}'::jsonb, now())"
            ),
            {"v": str(version_id), "u": str(user_id)},
        )

    yield user_id, version_id

    async with factory() as session, session.begin():
        await session.execute(text("DELETE FROM users WHERE id = :u"), {"u": str(user_id)})
    await engine.dispose()
