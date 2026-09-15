"""Invariant 7': every reveal of a candidate's private data is audited, under blanket access.

R14 deleted the unlock, and with it the one-row-per-unlock trail PRD rule 9
was satisfied by. So the audit moved to the read: **every profile opened
writes an `audit_events` row and a `candidate_view_events` row, in the same
transaction as the reveal** -- re-opens included, never carrying the personal
data it records the disclosure of.
"""

from __future__ import annotations

import json
import uuid
from typing import Any

import pytest
from sqlalchemy import text

from tests.conftest import _seed_url, sessions
from tests.integration.test_candidate_marketplace import _employer
from tests.integration.test_masked_search import SEARCH, _candidate, _token

pytestmark = [pytest.mark.invariant, pytest.mark.integration]


async def audit_rows(tenant_id: str, action: str = "candidate_profile_viewed") -> list[Any]:
    async with sessions(_seed_url())() as session:
        result = await session.execute(
            text(
                "SELECT actor_id, actor_role, target_type, target_id, metadata FROM audit_events "
                "WHERE tenant_id = :t AND action = :a ORDER BY id"
            ),
            {"t": tenant_id, "a": action},
        )
        return list(result)


async def view_events(tenant_id: str) -> list[Any]:
    async with sessions(_seed_url())() as session:
        result = await session.execute(
            text(
                "SELECT actor_id, candidate_id FROM candidate_view_events "
                "WHERE tenant_id = :t ORDER BY id"
            ),
            {"t": tenant_id},
        )
        return list(result)


async def owner_id(tenant_id: str) -> uuid.UUID:
    async with sessions(_seed_url())() as session:
        return uuid.UUID(
            str(
                await session.scalar(
                    text(
                        "SELECT user_id FROM memberships "
                        "WHERE tenant_id = :t AND role = 'EMPLOYER_OWNER'"
                    ),
                    {"t": tenant_id},
                )
            )
        )


async def test_every_open_writes_one_audit_row_and_one_view_event(
    client: Any, mint_token: Any
) -> None:
    candidate = await _candidate(mint_token, _token())
    employer = await _employer(client, mint_token)
    owner = await owner_id(employer["tenant_id"])

    for _ in range(2):  # a re-open is a disclosure too
        response = await client.get(f"{SEARCH}/{candidate['id']}", headers=employer["headers"])
        assert response.status_code == 200, response.text

    audits = await audit_rows(employer["tenant_id"])
    assert len(audits) == 2
    for actor_id, actor_role, target_type, target_id, _metadata in audits:
        assert (actor_id, actor_role, target_type, target_id) == (
            owner,
            "EMPLOYER_OWNER",
            "candidate",
            str(candidate["id"]),
        )
    assert [tuple(r) for r in await view_events(employer["tenant_id"])] == [
        (owner, candidate["id"])
    ] * 2


async def test_the_audit_row_holds_identifiers_and_no_personal_data(
    client: Any, mint_token: Any
) -> None:
    """An audit table full of phone numbers is its own privacy problem."""
    candidate = await _candidate(mint_token, _token())
    employer = await _employer(client, mint_token)
    revealed = (await client.get(f"{SEARCH}/{candidate['id']}", headers=employer["headers"])).json()

    (row,) = await audit_rows(employer["tenant_id"])
    metadata = row.metadata
    assert set(metadata) == {"score_id", "resume_version_id"}
    stored = json.dumps(metadata)
    for private in (revealed["phone"], revealed["email"], revealed["full_name"], revealed["score"]):
        if private is not None:
            assert str(private) not in stored


async def test_no_audit_row_means_no_reveal(client: Any, mint_token: Any, monkeypatch: Any) -> None:
    """In-transaction, not best-effort: if the audit write fails, the view
    event written a moment earlier rolls back with it and nothing is returned."""
    from app.core.db import get_session_factory
    from app.core.tenant import TenantContext
    from app.modules.discovery import service as discovery_service

    candidate = await _candidate(mint_token, _token())
    employer = await _employer(client, mint_token)
    ctx = TenantContext(
        user_id=await owner_id(employer["tenant_id"]),
        tenant_id=uuid.UUID(employer["tenant_id"]),
        role="EMPLOYER_OWNER",
        pool="BUSINESS",
    )

    async def failing_audit(*_args: Any, **_kwargs: Any) -> None:
        raise RuntimeError("audit store unavailable")

    monkeypatch.setattr(discovery_service, "audit_event", failing_audit)
    with pytest.raises(RuntimeError, match="audit store unavailable"):
        async with get_session_factory()() as session, session.begin():
            await discovery_service.open_candidate(session, ctx=ctx, candidate_id=candidate["id"])

    assert await view_events(employer["tenant_id"]) == []
    assert await audit_rows(employer["tenant_id"]) == []
