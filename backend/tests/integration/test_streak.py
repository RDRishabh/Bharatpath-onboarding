"""Streaks end to end, against a real Postgres.

Service calls go through the **app role**, not the migrator, so the grants are
exercised as production has them: INSERT and UPDATE on `user_streaks`, INSERT
only on the ledger, SELECT on `config_values`.

Time is injected through `now`. Every instant below is 12:00 UTC, which is
17:30 IST on the same calendar date, so `day(n)` is unambiguous.
"""

from __future__ import annotations

import asyncio
import os
import uuid
from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, ProgrammingError

from tests.conftest import _seed_url, sessions

pytestmark = pytest.mark.integration

APP_URL = os.getenv("DATABASE_URL_APP") or os.getenv("DATABASE_URL", "")
D0 = date(2026, 3, 1)


def at(n: int) -> datetime:
    d = D0 + timedelta(days=n)
    return datetime(d.year, d.month, d.day, 12, 0, tzinfo=UTC)


@pytest.fixture
async def candidate():
    user_id = uuid.uuid4()
    seed = sessions(_seed_url())
    async with seed() as session, session.begin():
        await session.execute(
            text(
                "INSERT INTO users (id, pool, phone, status, locale) "
                "VALUES (:u, 'CANDIDATE', :p, 'ACTIVE', 'en')"
            ),
            {"u": str(user_id), "p": f"+9197{uuid.uuid4().int % 10**8:08d}"},
        )
    yield user_id
    async with seed() as session, session.begin():
        await session.execute(text("DELETE FROM users WHERE id = :u"), {"u": str(user_id)})


@pytest.fixture
async def streak_rules_config():
    """Insert a rules row for the duration of one test. `config_values` is
    global, so a row left behind would change every later test's rules.

    Effective from well before `D0` by default: the tests simulate days in
    March 2026, and a row effective from the real `now()` would not yet apply.
    """
    seed = sessions(_seed_url())
    inserted: list[str] = []

    async def _insert(value: str, *, version: int, effective_from: datetime | None = None) -> None:
        row_id = str(uuid.uuid4())
        async with seed() as session, session.begin():
            await session.execute(
                text(
                    "INSERT INTO config_values (id, key, value, version, effective_from) "
                    "VALUES (:i, 'engagement.streak_rules', CAST(:v AS jsonb), :n, :e)"
                ),
                {
                    "i": row_id,
                    "v": value,
                    "n": version,
                    "e": effective_from or datetime(2000, 1, 1, tzinfo=UTC),
                },
            )
        inserted.append(row_id)

    yield _insert

    async with seed() as session, session.begin():
        await session.execute(
            text("DELETE FROM config_values WHERE id = ANY(CAST(:ids AS uuid[]))"),
            {"ids": inserted},
        )


async def _open(user_id: uuid.UUID, n: int):
    from app.modules.engagement import service

    async with sessions(APP_URL)() as session, session.begin():
        return await service.record_app_open(session, user_id=user_id, now=at(n))


async def _ledger(user_id: uuid.UUID) -> list[dict]:
    async with sessions(_seed_url())() as session:
        rows = await session.execute(
            text(
                "SELECT kind, points, requested_points, balance_after, streak_length, "
                "milestone_days, rules_version FROM streak_point_events "
                "WHERE user_id = :u ORDER BY created_at, activity_on"
            ),
            {"u": str(user_id)},
        )
        return [dict(r) for r in rows.mappings()]


# --- the basic day-by-day behaviour ---------------------------------------
async def test_the_first_open_of_a_day_counts_and_the_rest_do_not(candidate) -> None:
    first = await _open(candidate, 0)
    again = await _open(candidate, 0)

    assert first.counted and not again.counted
    assert again.summary.view.current_streak == 1
    assert again.summary.view.status == "ACTIVE_TODAY"


async def test_thirty_consecutive_days_award_the_first_milestone(candidate) -> None:
    for n in range(30):
        result = await _open(candidate, n)

    assert result.summary.view.current_streak == 30
    assert result.summary.view.points_balance == 10
    assert await _ledger(candidate) == [
        {
            "kind": "MILESTONE_AWARD",
            "points": 10,
            "requested_points": 10,
            "balance_after": 10,
            "streak_length": 30,
            "milestone_days": 30,
            "rules_version": "default-v1-2026-09-13",
        }
    ]


async def test_a_missed_day_breaks_the_streak_and_deducts_once(candidate) -> None:
    for n in range(30):
        await _open(candidate, n)
    result = await _open(candidate, 35)

    view = result.summary.view
    assert (view.current_streak, view.longest_streak, view.points_balance) == (1, 30, 0)
    penalty = (await _ledger(candidate))[-1]
    assert (penalty["kind"], penalty["points"], penalty["streak_length"]) == (
        "STREAK_BREAK_PENALTY",
        -10,
        30,
    )


async def test_a_deduction_is_clipped_at_zero_and_the_ledger_says_so(candidate) -> None:
    await _open(candidate, 0)
    await _open(candidate, 1)
    result = await _open(candidate, 4)

    assert result.summary.view.points_balance == 0
    (row,) = await _ledger(candidate)
    assert (row["points"], row["requested_points"]) == (0, -10)


async def test_reading_a_broken_streak_writes_nothing(candidate) -> None:
    """GET shows the break at once; only a check-in applies the deduction."""
    from app.modules.engagement import service

    await _open(candidate, 0)
    async with sessions(APP_URL)() as session, session.begin():
        summary = await service.get_streak(session, user_id=candidate, now=at(5))

    assert (summary.view.status, summary.view.current_streak) == ("BROKEN", 0)
    assert await _ledger(candidate) == []


async def test_two_simultaneous_first_opens_count_once(candidate) -> None:
    """Phone and laptop at once. The row lock is what makes this 1, not 2."""
    results = await asyncio.gather(_open(candidate, 0), _open(candidate, 0))
    assert sorted(r.counted for r in results) == [False, True]


async def test_simultaneous_opens_after_a_break_deduct_once(candidate) -> None:
    for n in range(30):
        await _open(candidate, n)
    await asyncio.gather(_open(candidate, 40), _open(candidate, 40), _open(candidate, 40))

    kinds = [r["kind"] for r in await _ledger(candidate)]
    assert kinds.count("STREAK_BREAK_PENALTY") == 1


# --- configurable ---------------------------------------------------------
async def test_a_config_row_changes_the_numbers(candidate, streak_rules_config) -> None:
    await streak_rules_config(
        '{"break_penalty": 3, "milestones": [{"days": 2, "points": 7}]}', version=900_001
    )

    await _open(candidate, 0)
    await _open(candidate, 1)
    result = await _open(candidate, 9)

    assert result.summary.view.points_balance == 4
    assert result.summary.rules.version == "config-v900001"
    assert [(r["kind"], r["points"], r["rules_version"]) for r in await _ledger(candidate)] == [
        ("MILESTONE_AWARD", 7, "config-v900001"),
        ("STREAK_BREAK_PENALTY", -3, "config-v900001"),
    ]


async def test_a_config_row_not_yet_in_effect_is_ignored(candidate, streak_rules_config) -> None:
    await streak_rules_config(
        '{"break_penalty": 99}', version=900_002, effective_from=at(0) + timedelta(days=3650)
    )
    result = await _open(candidate, 0)
    assert result.summary.rules.version == "default-v1-2026-09-13"


async def test_a_malformed_config_row_fails_loudly(candidate, streak_rules_config) -> None:
    """Falling back to defaults would make the broken row look applied."""
    from app.modules.engagement.service import StreakRulesInvalidError

    await streak_rules_config('{"break_penality": 3}', version=900_003)
    with pytest.raises(StreakRulesInvalidError):
        await _open(candidate, 0)


# --- the boundary with the score, and the grants --------------------------
async def test_streak_points_never_write_a_score(candidate) -> None:
    for n in range(30):
        await _open(candidate, n)
    await _open(candidate, 40)

    async with sessions(_seed_url())() as session:
        count = await session.scalar(
            text("SELECT count(*) FROM scores WHERE user_id = :u"), {"u": str(candidate)}
        )
    assert count == 0


async def test_the_points_ledger_is_append_only(candidate) -> None:
    for n in range(30):
        await _open(candidate, n)

    for statement in (
        "UPDATE streak_point_events SET points = 1000 WHERE user_id = :u",
        "DELETE FROM streak_point_events WHERE user_id = :u",
    ):
        async with sessions(APP_URL)() as session, session.begin():
            with pytest.raises((ProgrammingError, DBAPIError)) as exc:
                await session.execute(text(statement), {"u": str(candidate)})
            assert "permission denied" in str(exc.value).lower()


async def test_the_database_refuses_a_negative_balance(candidate) -> None:
    async with sessions(_seed_url())() as session, session.begin():
        with pytest.raises((DBAPIError, ProgrammingError)) as exc:
            await session.execute(
                text("INSERT INTO user_streaks (user_id, points_balance) VALUES (:u, -1)"),
                {"u": str(candidate)},
            )
    assert "ck_user_streaks_balance_nonnegative" in str(exc.value)


# --- HTTP -----------------------------------------------------------------
async def test_the_api_flow_for_a_candidate(client, mint_token) -> None:
    headers, subject = mint_token(pool="CANDIDATE", phone=f"+9196{uuid.uuid4().int % 10**8:08d}")
    try:
        before = await client.get("/api/v1/candidate/streak/me", headers=headers)
        assert before.status_code == 200
        assert before.json()["status"] == "NONE"
        assert before.json()["points_balance"] == 0
        assert before.json()["milestones"] == [
            {"days": 30, "points": 10},
            {"days": 90, "points": 15},
            {"days": 365, "points": 20},
        ]

        first = await client.post("/api/v1/candidate/streak/me/check-in", headers=headers)
        assert first.status_code == 200
        body = first.json()
        assert body["counted"] is True
        assert body["streak"]["current_streak"] == 1
        assert body["streak"]["status"] == "ACTIVE_TODAY"
        assert body["changes"] == []

        second = await client.post("/api/v1/candidate/streak/me/check-in", headers=headers)
        assert second.json()["counted"] is False

        history = await client.get("/api/v1/candidate/streak/me/points", headers=headers)
        assert history.status_code == 200
        assert history.json() == []
    finally:
        async with sessions(_seed_url())() as session, session.begin():
            await session.execute(text("DELETE FROM users WHERE cognito_sub = :s"), {"s": subject})


async def test_a_business_user_has_no_streak(client, mint_token, business_member) -> None:
    headers, _ = mint_token(pool="BUSINESS", subject=business_member["subject"])
    response = await client.post("/api/v1/candidate/streak/me/check-in", headers=headers)
    assert response.status_code == 403
