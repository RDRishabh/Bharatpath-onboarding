"""Shared fixtures.

Integration tests use a real Postgres via testcontainers. Never SQLite: RLS,
JSONB, partial indexes and `SET LOCAL` all behave differently there, and those
are exactly what the tests exist to exercise.
"""

from __future__ import annotations

import os
from collections.abc import Iterator

import pytest

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
async def client(app):
    from httpx import ASGITransport, AsyncClient

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture(scope="session")
def postgres_container() -> Iterator[object]:
    """A real Postgres 16. Skipped if Docker is unavailable."""
    docker = pytest.importorskip("testcontainers.postgres")
    with docker.PostgresContainer("postgres:16-alpine") as pg:
        yield pg


@pytest.fixture(scope="module")
async def seeded_tenants():
    """Two tenants with an employer row each, for cross-tenant assertions.

    Seeded through the migrator connection, which owns the tables, because
    the app role cannot insert rows for a tenant it is not currently scoped
    to - which is the whole point of the isolation being tested.
    """
    import os
    import uuid

    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    url = os.getenv("DATABASE_URL_MIGRATOR") or os.getenv("DATABASE_URL", "")
    engine = create_async_engine(url)
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
