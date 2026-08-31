"""CORS. Without this the three web consoles cannot call the API at all.

The browser blocks a cross-origin request *before it leaves the machine*
unless the server opts in, so this is not a hardening detail - it is the
difference between a frontend that works and one that shows an opaque
"Network Error" in the console.
"""

from __future__ import annotations

import pytest


async def test_preflight_is_answered_for_an_allowed_origin(client) -> None:
    """The browser sends OPTIONS first for anything with a custom header.

    If this 400s or omits the header, every real request that follows is
    blocked and the frontend developer sees no useful error.
    """
    response = await client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


async def test_authorization_header_is_permitted(client) -> None:
    """Every authenticated call carries `Authorization: Bearer ...`.

    Omitting it from allow_headers is the single most common CORS mistake:
    unauthenticated calls work, authenticated ones fail, and it looks like an
    auth bug rather than a CORS one.
    """
    response = await client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type,idempotency-key",
        },
    )
    allowed = response.headers.get("access-control-allow-headers", "").lower()
    for header in ("authorization", "content-type", "idempotency-key"):
        assert header in allowed, f"{header} would be blocked by the browser"


async def test_unknown_origin_is_not_allowed(client) -> None:
    """An origin we did not list must not be echoed back."""
    response = await client.get("/api/v1/health", headers={"Origin": "https://evil.example"})
    assert response.headers.get("access-control-allow-origin") != "https://evil.example"


async def test_correlation_id_is_readable_by_the_client(client) -> None:
    """Exposed deliberately, so a user can quote it in a bug report.

    Browsers hide response headers from JavaScript unless the server lists
    them in `Access-Control-Expose-Headers`.
    """
    response = await client.get("/api/v1/health", headers={"Origin": "http://localhost:3000"})
    exposed = response.headers.get("access-control-expose-headers", "").lower()
    assert "x-request-id" in exposed


@pytest.mark.parametrize("origin", ["http://localhost:3000", "http://localhost:5173"])
async def test_each_console_origin_is_allowed(client, origin: str) -> None:
    response = await client.get("/api/v1/health", headers={"Origin": origin})
    assert response.headers.get("access-control-allow-origin") == origin
