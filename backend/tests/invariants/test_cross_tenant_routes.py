"""Week 1 gate, Day 5: tenant A asking for tenant B's resource gets a 404.

**Every tenant-scoped route that takes an identifier must have a case here, or
this file fails the build.** The plan asks for "every tenant-scoped endpoint",
and a list written once goes stale the day the next endpoint lands. So the
routes are enumerated from the running application, and a route with an id in
its path and no registered cross-tenant case is a failure that names it.

404, never 403: a 403 would confirm that tenant B's resource exists
(`app/core/errors.py`). Row-Level Security proves isolation in the database
(`test_rls_and_grants.py`); this proves it through the API, where a missing
`WHERE` or a tenant id read from the path would actually leak.

Routes with no identifier -- "my organisation", "my team" -- cannot name
another tenant's resource at all, so they get a different check: that what
comes back is only ever the caller's own.
"""

from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable
from typing import Any

import pytest

pytestmark = [pytest.mark.invariant, pytest.mark.integration]

API = "/api/v1"
#: The surfaces whose routes act on one tenant's data.
TENANT_SURFACES = (f"{API}/employer", f"{API}/college", f"{API}/admin")
ORG = {"legal_name": "Isolation Test Pvt Ltd", "industry": "IT_SOFTWARE"}


def _email() -> str:
    return f"{uuid.uuid4().hex[:12]}@example.test"


async def _organisation(client: Any, mint_token: Any) -> dict[str, Any]:
    """A tenant with an owner and one viewer. Returns headers and ids."""
    headers, _ = mint_token(pool="BUSINESS", email=_email())
    created = await client.post(f"{API}/employer/organisation", json=ORG, headers=headers)
    assert created.status_code == 201, created.text
    member = await client.post(
        f"{API}/employer/team", json={"email": _email(), "role": "EMPLOYER_VIEWER"}, headers=headers
    )
    assert member.status_code == 201, member.text
    return {
        "headers": headers,
        "tenant_id": created.json()["tenant_id"],
        "member_id": member.json()["user_id"],
    }


Case = Callable[[Any, dict[str, Any], dict[str, Any]], Awaitable[Any]]


async def _patch_other_member(client: Any, attacker: dict, victim: dict) -> Any:
    return await client.patch(
        f"{API}/employer/team/{victim['member_id']}",
        json={"role": "EMPLOYER_OWNER"},
        headers=attacker["headers"],
    )


async def _delete_other_member(client: Any, attacker: dict, victim: dict) -> Any:
    return await client.delete(
        f"{API}/employer/team/{victim['member_id']}", headers=attacker["headers"]
    )


#: `(METHOD, path template) -> a request from tenant A for tenant B's resource`.
#: Adding a tenant route with an id means adding its case here; the test below
#: refuses to pass until someone does.
CROSS_TENANT_CASES: dict[tuple[str, str], Case] = {
    ("PATCH", f"{API}/employer/team/{{user_id}}"): _patch_other_member,
    ("DELETE", f"{API}/employer/team/{{user_id}}"): _delete_other_member,
}


def _tenant_routes_with_ids(app: Any) -> set[tuple[str, str]]:
    return {
        (method.upper(), path)
        for path, operations in app.openapi()["paths"].items()
        if path.startswith(TENANT_SURFACES) and "{" in path
        for method in operations
    }


def test_every_tenant_route_with_an_id_has_a_cross_tenant_case(app: Any) -> None:
    """**The guard on the guard.** Without it this suite covers the routes that
    existed the day it was written, and nothing after."""
    routes = _tenant_routes_with_ids(app)
    missing = sorted(routes - set(CROSS_TENANT_CASES))
    stale = sorted(set(CROSS_TENANT_CASES) - routes)
    assert not missing, (
        f"tenant routes with no cross-tenant case: {missing}. Add one to "
        "CROSS_TENANT_CASES -- tenant A asking for tenant B's resource must be a 404."
    )
    assert not stale, f"cases for routes that no longer exist: {stale}"


@pytest.mark.parametrize("route", sorted(CROSS_TENANT_CASES), ids=lambda r: f"{r[0]} {r[1]}")
async def test_another_tenants_resource_is_a_404(
    route: tuple[str, str], client: Any, mint_token: Any
) -> None:
    attacker = await _organisation(client, mint_token)
    victim = await _organisation(client, mint_token)

    response = await CROSS_TENANT_CASES[route](client, attacker, victim)
    assert response.status_code == 404, (
        f"{route[0]} {route[1]} answered {response.status_code} for another tenant's "
        "resource. A 403 confirms it exists; a 2xx means it leaked."
    )

    # And nothing changed on the victim's side.
    team = await client.get(f"{API}/employer/team", headers=victim["headers"])
    assert victim["member_id"] in {m["user_id"] for m in team.json()}


async def test_routes_without_an_id_only_ever_return_the_callers_own_tenant(
    client: Any, mint_token: Any
) -> None:
    """No identifier to swap, so the risk is different: a query that forgot its
    tenant filter would return someone else's rows to everyone."""
    a = await _organisation(client, mint_token)
    b = await _organisation(client, mint_token)

    org_a = (await client.get(f"{API}/employer/organisation", headers=a["headers"])).json()
    org_b = (await client.get(f"{API}/employer/organisation", headers=b["headers"])).json()
    assert org_a["tenant_id"] == a["tenant_id"]
    assert org_b["tenant_id"] == b["tenant_id"]

    team_a = {
        m["user_id"]
        for m in (await client.get(f"{API}/employer/team", headers=a["headers"])).json()
    }
    assert b["member_id"] not in team_a
    assert a["member_id"] in team_a


async def test_a_smuggled_tenant_id_changes_nothing(client: Any, mint_token: Any) -> None:
    """SRS 2.24.7: the tenant is the caller's resolved membership, never a value
    they send. A header, a query string or a body field naming tenant B must be
    ignored -- or refused -- but never honoured."""
    a = await _organisation(client, mint_token)
    b = await _organisation(client, mint_token)

    response = await client.get(
        f"{API}/employer/organisation",
        params={"tenant_id": b["tenant_id"]},
        headers={**a["headers"], "X-Tenant-Id": b["tenant_id"]},
    )
    assert response.status_code == 200
    assert response.json()["tenant_id"] == a["tenant_id"]
