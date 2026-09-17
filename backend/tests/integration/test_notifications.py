"""Day 19: notification fan-out off the outbox, the inbox and preferences,
suppression, and incomplete-profile nudges.

Events are produced the real way -- through the routes that emit them -- and
dispatched by calling the service the task calls, on the app role.
"""

from __future__ import annotations

import os
import uuid
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from sqlalchemy import text

from app.modules.notifications import service
from app.modules.notifications.providers import StubEmailProvider, StubSmsProvider
from app.modules.notifications.templates import template_by_code
from tests.conftest import _seed_url, sessions
from tests.integration.test_admin_console import _staff
from tests.integration.test_college import _college
from tests.integration.test_college_consent import _linked_student, _revoke
from tests.integration.test_pipeline import _applied

pytestmark = pytest.mark.integration

API = "/api/v1"
INBOX = f"{API}/notifications"
APP_URL = os.environ.get("DATABASE_URL", "")
#: Noon in India on a fixed day, so the sending-hours rule never decides a test.
NOON_IST = datetime(2031, 3, 12, 6, 30, tzinfo=UTC)


# --- helpers ------------------------------------------------------------------------
@pytest.fixture
def stub_sms(monkeypatch: pytest.MonkeyPatch) -> StubSmsProvider:
    """A configured SMS provider that records, and every SMS template treated
    as DLT-registered -- the state the product reaches once D1 clears."""
    provider = StubSmsProvider()
    monkeypatch.setattr(service, "get_sms_provider", lambda: provider)
    monkeypatch.setattr(service, "get_email_provider", lambda: StubEmailProvider())

    def registered(code: str) -> Any:
        template = template_by_code(code)
        if template is not None and template.channel == "SMS":
            return replace(template, dlt_template_id=f"1107{abs(hash(code)) % 10**15:015d}")
        return template

    monkeypatch.setattr(service, "template_by_code", registered)
    return provider


async def _event_id(event_type: str, aggregate_id: str) -> uuid.UUID:
    async with sessions(_seed_url())() as session:
        found = await session.scalar(
            text(
                "SELECT id FROM outbox WHERE event_type = :e AND aggregate_id = :a "
                "ORDER BY created_at DESC LIMIT 1"
            ),
            {"e": event_type, "a": aggregate_id},
        )
    assert found is not None, (event_type, aggregate_id)
    return found


async def _dispatch(event_id: uuid.UUID) -> list[service.Outgoing]:
    async with sessions(APP_URL)() as session, session.begin():
        return await service.dispatch_event(session, event_id=event_id)


async def _send(outgoing: list[service.Outgoing]) -> list[str]:
    states = []
    for message in outgoing:
        async with sessions(APP_URL)() as session, session.begin():
            states.append(await service.send(session, message=message))
    return states


async def _rows(**where: Any) -> list[dict[str, Any]]:
    clauses = " AND ".join(f"{column} = :{column}" for column in where)
    async with sessions(_seed_url())() as session:
        result = await session.execute(
            text(f"SELECT * FROM notifications WHERE {clauses} ORDER BY template_code"),
            {k: str(v) for k, v in where.items()},
        )
        return [dict(row) for row in result.mappings()]


# --- fan-out and the inbox -------------------------------------------------------------------
async def test_an_application_reaches_the_inbox_and_the_sms_waits_on_dlt(
    client: Any, mint_token: Any
) -> None:
    a = await _applied(client, mint_token)
    event_id = await _event_id("applications.application_submitted", a["id"])

    assert await _dispatch(event_id) == [], "no SMS may leave without a DLT registration"
    rows = await _rows(source_event_id=event_id)
    by_channel = {row["channel"]: row for row in rows}
    assert set(by_channel) == {"IN_APP", "SMS"}
    assert by_channel["IN_APP"]["state"] == "DELIVERED"
    assert a["employer"]["name"] in by_channel["IN_APP"]["body"]
    assert (by_channel["SMS"]["state"], by_channel["SMS"]["skip_reason"]) == (
        "SKIPPED",
        "DLT_UNREGISTERED",
    )

    await _dispatch(event_id)
    assert len(await _rows(source_event_id=event_id)) == 2, "a second delivery duplicated"

    candidate = a["candidate"]["headers"]
    inbox = await client.get(INBOX, headers=candidate)
    assert inbox.status_code == 200, inbox.text
    [item] = [i for i in inbox.json()["items"] if i["id"] == str(by_channel["IN_APP"]["id"])]
    assert item["template_code"] == "IN_APP_APPLICATION_SENT" and item["read_at"] is None
    unread = inbox.json()["unread"]

    stranger = await client.post(f"{INBOX}/{item['id']}/read", headers=a["employer"]["headers"])
    assert stranger.status_code == 404
    read = await client.post(f"{INBOX}/{item['id']}/read", headers=candidate)
    assert read.status_code == 200 and read.json()["read_at"] is not None
    assert (await client.get(INBOX, headers=candidate)).json()["unread"] == unread - 1


async def test_a_registered_sms_is_sent_once_whatever_the_relay_repeats(
    client: Any, mint_token: Any, stub_sms: StubSmsProvider
) -> None:
    a = await _applied(client, mint_token)
    event_id = await _event_id("applications.application_submitted", a["id"])

    first = await _dispatch(event_id)
    assert [m.channel for m in first] == ["SMS"]
    # The attempt died before sending: the retry finds the same PENDING row.
    retried = await _dispatch(event_id)
    assert [m.notification_id for m in retried] == [first[0].notification_id]

    assert await _send(first + retried) == ["SENT", "NOT_PENDING"]
    assert len(stub_sms.sent) == 1
    phone = await _phone(a["candidate"]["id"])
    assert stub_sms.sent[0]["to"] == phone
    [sms] = [r for r in await _rows(source_event_id=event_id) if r["channel"] == "SMS"]
    assert (sms["state"], sms["provider"]) == ("SENT", "stub")
    assert phone not in sms["body"], "a contact detail was written into the message row"
    assert await _dispatch(event_id) == []


async def _phone(user_id: Any) -> str:
    async with sessions(_seed_url())() as session:
        return str(
            await session.scalar(text("SELECT phone FROM users WHERE id = :u"), {"u": str(user_id)})
        )


async def test_preferences_turn_a_channel_off_and_set_the_language(
    client: Any, mint_token: Any, stub_sms: StubSmsProvider
) -> None:
    a = await _applied(client, mint_token)
    headers = a["candidate"]["headers"]
    before = await client.get(f"{INBOX}/preferences", headers=headers)
    assert before.json() == {
        "locale": "en",
        "sms_enabled": True,
        "email_enabled": True,
        "push_enabled": True,
        "nudges_enabled": True,
    }
    changed = await client.patch(
        f"{INBOX}/preferences", json={"sms_enabled": False, "locale": "hi"}, headers=headers
    )
    assert changed.status_code == 200, changed.text
    assert changed.json()["sms_enabled"] is False and changed.json()["locale"] == "hi"
    assert changed.json()["email_enabled"] is True
    refused = await client.patch(f"{INBOX}/preferences", json={"locale": "fr"}, headers=headers)
    assert refused.status_code == 422

    event_id = await _event_id("applications.application_submitted", a["id"])
    assert await _dispatch(event_id) == []
    [sms] = [r for r in await _rows(source_event_id=event_id) if r["channel"] == "SMS"]
    assert (sms["skip_reason"], sms["locale"]) == ("OPTED_OUT", "hi")
    assert stub_sms.sent == []


async def test_support_can_suppress_a_channel_and_it_is_audited(
    client: Any, mint_token: Any, stub_sms: StubSmsProvider
) -> None:
    agent = await _staff(mint_token, "SUPPORT_AGENT")
    a = await _applied(client, mint_token)
    url = f"{API}/admin/users/{a['candidate']['id']}/notification-suppressions"
    body = {"channel": "SMS", "reason": "SUPPORT_REQUEST"}

    first = await client.post(url, json=body, headers=agent["headers"])
    assert first.status_code == 200, first.text
    assert first.json()["created"] is True
    assert (await client.post(url, json=body, headers=agent["headers"])).json()["created"] is False
    refused = await client.post(url, json=body, headers=a["employer"]["headers"])
    assert refused.status_code == 403

    event_id = await _event_id("applications.application_submitted", a["id"])
    assert await _dispatch(event_id) == []
    [sms] = [r for r in await _rows(source_event_id=event_id) if r["channel"] == "SMS"]
    assert sms["skip_reason"] == "SUPPRESSED"
    async with sessions(_seed_url())() as session:
        audited = await session.scalar(
            text(
                "SELECT count(*) FROM audit_events WHERE action = 'notifications_suppressed' "
                "AND actor_id = :u AND target_id = :t"
            ),
            {"u": str(agent["user_id"]), "t": str(a["candidate"]["id"])},
        )
    assert audited == 2


async def test_a_college_is_told_a_student_left_and_not_who(client: Any, mint_token: Any) -> None:
    """Blockers E28: beside a dashboard that just moved, a name would say
    whose band left the distribution."""
    college = await _college(client, mint_token)
    student = await _linked_student(client, mint_token, college)
    revoked = await _revoke(client, student, college["tenant_id"], "ROSTER")
    assert revoked.status_code == 200, revoked.text

    async with sessions(_seed_url())() as session:
        event_id = await session.scalar(
            text(
                "SELECT id FROM outbox WHERE event_type = 'college.consent_revoked' "
                "AND payload->>'tenant_id' = :t ORDER BY created_at DESC LIMIT 1"
            ),
            {"t": college["tenant_id"]},
        )
    await _dispatch(event_id)
    [row] = await _rows(source_event_id=event_id)
    assert row["template_code"] == "IN_APP_COLLEGE_STUDENT_DISCONNECTED"
    assert row["user_id"] != student["id"]
    assert str(student["id"]) not in row["body"]
    inbox = await client.get(INBOX, headers=college["headers"])
    assert str(row["id"]) in {item["id"] for item in inbox.json()["items"]}


# --- nudges --------------------------------------------------------------------------------------
async def _signed_up(days_ago: int, *, now: datetime = NOON_IST) -> uuid.UUID:
    user_id = uuid.uuid4()
    async with sessions(_seed_url())() as session, session.begin():
        await session.execute(
            text(
                "INSERT INTO users (id, pool, phone, status, locale, created_at) "
                "VALUES (:u, 'CANDIDATE', :p, 'ACTIVE', 'en', :c)"
            ),
            {
                "u": str(user_id),
                "p": f"+9193{uuid.uuid4().int % 10**8:08d}",
                "c": now - timedelta(days=days_ago),
            },
        )
    return user_id


async def _nudge(user_id: uuid.UUID, now: datetime) -> service.NudgePage:
    """One page holding exactly this person: the keyset starts just below them."""
    async with sessions(APP_URL)() as session, session.begin():
        return await service.nudge_page(
            session, now=now, after_id=uuid.UUID(int=user_id.int - 1), limit=1
        )


async def _nudges(user_id: uuid.UUID) -> int:
    async with sessions(_seed_url())() as session:
        return int(
            await session.scalar(
                text("SELECT count(*) FROM profile_nudges WHERE user_id = :u"), {"u": str(user_id)}
            )
        )


async def test_a_nudge_waits_its_interval_and_stops_at_the_cap() -> None:
    user_id = await _signed_up(2)

    page = await _nudge(user_id, NOON_IST)
    assert (page.examined, page.nudged) == (1, 1)
    rows = await _rows(user_id=user_id, category="NUDGE")
    assert {(r["channel"], r["state"], r["skip_reason"]) for r in rows} == {
        ("IN_APP", "DELIVERED", None),
        ("SMS", "SKIPPED", "DLT_UNREGISTERED"),
        ("EMAIL", "SKIPPED", "NO_CONTACT"),
    }

    assert (await _nudge(user_id, NOON_IST)).nudged == 0, "nudged twice in one sweep window"
    assert (await _nudge(user_id, NOON_IST + timedelta(hours=71))).nudged == 0
    assert (await _nudge(user_id, NOON_IST + timedelta(hours=72))).nudged == 1
    assert (await _nudge(user_id, NOON_IST + timedelta(hours=144))).nudged == 1
    assert (await _nudge(user_id, NOON_IST + timedelta(days=60))).nudged == 0
    assert await _nudges(user_id) == 3


async def test_nobody_is_nudged_who_started_a_profile_opted_out_or_just_arrived() -> None:
    from app.modules.resume import service as resume_service

    started = await _signed_up(3)
    async with sessions(_seed_url())() as session, session.begin():
        await resume_service.create_pasted_version(
            session, user_id=started, text=f"Machinist, {uuid.uuid4().hex} years of CNC work."
        )
    opted_out = await _signed_up(3)
    async with sessions(_seed_url())() as session, session.begin():
        await session.execute(
            text(
                "INSERT INTO notification_preferences (user_id, sms_enabled, email_enabled, "
                "push_enabled, nudges_enabled) VALUES (:u, true, true, true, false)"
            ),
            {"u": str(opted_out)},
        )
    newcomer = await _signed_up(0)

    for user_id in (started, opted_out, newcomer):
        await _nudge(user_id, NOON_IST)
        assert await _nudges(user_id) == 0, user_id


async def test_nobody_is_nudged_at_night() -> None:
    user_id = await _signed_up(2)
    ten_pm_ist = NOON_IST + timedelta(hours=10)
    page = await _nudge(user_id, ten_pm_ist)
    assert (page.examined, page.nudged) == (0, 0)


async def test_a_bad_nudge_rule_stops_the_sweep_rather_than_defaulting() -> None:
    user_id = await _signed_up(2)
    version = 2_000_000 + uuid.uuid4().int % 1_000_000
    async with sessions(_seed_url())() as session, session.begin():
        await session.execute(
            text(
                "INSERT INTO config_values (id, key, value, version, effective_from) "
                "VALUES (gen_random_uuid(), 'notifications.nudges', "
                "CAST(:v AS jsonb), :n, :f)"
            ),
            {"v": '{"min_interval_hours": 1}', "n": version, "f": datetime(2026, 1, 1, tzinfo=UTC)},
        )
    try:
        with pytest.raises(service.NudgeRulesInvalidError):
            await _nudge(user_id, NOON_IST)
        assert await _nudges(user_id) == 0
    finally:
        async with sessions(_seed_url())() as session, session.begin():
            await session.execute(
                text(
                    "DELETE FROM config_values WHERE key = 'notifications.nudges' AND version = :n"
                ),
                {"n": version},
            )
