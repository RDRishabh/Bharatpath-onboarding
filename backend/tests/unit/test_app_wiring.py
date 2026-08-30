"""Day 1 smoke tests: the app builds, every module is registered, health works."""

from __future__ import annotations

import pytest

from app.modules import ALL_MODULES


def test_all_modules_registered() -> None:
    """Every module in the registry exposes a name, a prefix and a router hook.

    plan.md section 4 promises the client teams a publishable openapi.json from
    Day 2. That only holds if every module is wired on Day 1, even empty.
    """
    assert len(ALL_MODULES) == 20
    for module in ALL_MODULES:
        assert isinstance(module.name, str) and module.name
        assert module.prefix.startswith("/")
        assert hasattr(module, "get_router")


def test_module_prefixes_are_unique() -> None:
    prefixes = [m.prefix for m in ALL_MODULES]
    assert len(prefixes) == len(set(prefixes)), "two modules share a prefix"


def test_app_builds(app) -> None:  # noqa: ANN001
    assert app.title == "BharatPath"


async def test_health_endpoint(client) -> None:  # noqa: ANN001
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


async def test_openapi_schema_generates(client) -> None:  # noqa: ANN001
    """The OpenAPI export is a deliverable, not a side effect."""
    response = await client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "BharatPath"
    assert "/api/v1/health" in schema["paths"]


@pytest.mark.parametrize("path", ["/api/v1/health", "/api/v1/health/ready"])
async def test_correlation_id_on_every_response(client, path: str) -> None:  # noqa: ANN001
    response = await client.get(path)
    assert response.headers.get("X-Request-ID")
