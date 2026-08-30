"""Shared fixtures.

Integration tests use a real Postgres via testcontainers. Never SQLite: RLS,
JSONB, partial indexes and `SET LOCAL` all behave differently there, and those
are exactly what the tests exist to exercise.
"""

from __future__ import annotations

import os
from collections.abc import Iterator

import pytest

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://bharatpath:bharatpath@localhost:5432/bharatpath")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("ENVIRONMENT", "local")


@pytest.fixture(scope="session")
def app():  # noqa: ANN201
    from app.main import create_app

    return create_app()


@pytest.fixture
async def client(app):  # noqa: ANN001, ANN201
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
