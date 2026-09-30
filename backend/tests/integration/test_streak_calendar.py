"""The streak calendar end to end, against a real Postgres.

Service calls go through the **app role**, so the grants are exercised as
production has them: INSERT and SELECT on `streak_activity_days`, no UPDATE
or DELETE, and EXECUTE on the purge that deletes a year-old day.

Most tests inject `now`, as `test_streak.py` does: every instant is 12:00 UTC,
17:30 IST on the same date. The retention tests use the real clock, because
the purge clamps to the database's own day.
"""

from __future__ import annotations

import os
import uuid
from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, ProgrammingError

from app.modules.engagement.domain import ACTIVITY_RETENTION_DAYS
from tests.conftest import _seed_url, sessions

pytestmark = pytest.mark.integration

APP_URL = os.getenv("DATABASE_URL_APP") or os.getenv("DATABASE_URL", "")
#: A Monday.
D0 = date(2026, 3, 2)


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
            {"u": str(user_id), "p": f"+9195{uuid.uuid4().int % 10**8:08d}"},
        )
    yield user_id
    async with seed() as session, session.begin():
        await session.execute(text("DELETE FROM users WHERE id = :u"), {"u": str(user_id)})


async def _open(user_id: uuid.UUID, n: int):
    from app.modules.engagement import service

    async with sessions(APP_URL)() as session, session.begin():
        return await service.record_app_open(session, user_id=user_id, now=at(n))


async def _calendar(user_id: uuid.UUID, *, now: datetime, **kwargs):
    from app.modules.engagement import service

    async with sessions(APP_URL)() as session, session.begin():
        return await service.get_calendar(session, user_id=user_id, now=now, **kwargs)


async def _days(user_id: uuid.UUID) -> list[date]:
    async with sessions(_seed_url())() as session:
        rows = await session.execute(
            text(
                "SELECT activity_on FROM streak_activity_days WHERE user_id = :u "
                "ORDER BY activity_on"
            ),
            {"u": str(user_id)},
        )
        return list(rows.scalars())


def _ist_today() -> date:
    from app.modules.engagement.service import local_day

    return local_day(datetime.now(UTC))


# --- writing ---------------------------------------------------------------
async def test_a_check_in_records_its_day_once(candidate) -> None:
    await _open(candidate, 0)
    await _open(candidate, 0)
    await _open(candidate, 1)
    assert await _days(candidate) == [D0, D0 + timedelta(days=1)]


async def test_the_first_day_survives_a_break(candidate) -> None:
    await _open(candidate, 0)
    await _open(candidate, 5)
    async with sessions(_seed_url())() as session:
        first = await session.scalar(
            text("SELECT first_active_on FROM user_streaks WHERE user_id = :u"),
            {"u": str(candidate)},
        )
    assert first == D0


async def test_the_calendar_is_append_only_for_the_app(candidate) -> None:
    await _open(candidate, 0)
    for statement in (
        "UPDATE streak_activity_days SET activity_on = activity_on + 1 WHERE user_id = :u",
        "DELETE FROM streak_activity_days WHERE user_id = :u",
    ):
        async with sessions(APP_URL)() as session, session.begin():
            with pytest.raises((ProgrammingError, DBAPIError)) as exc:
                await session.execute(text(statement), {"u": str(candidate)})
            assert "permission denied" in str(exc.value).lower()


# --- reading -----------------------------------------------------------------
async def test_a_week_with_a_gap(candidate) -> None:
    """Opened Monday, Tuesday and Thursday; viewed on Friday afternoon."""
    for n in (0, 1, 3):
        await _open(candidate, n)
    view = await _calendar(candidate, now=at(4), period="week")

    assert (view.start, view.end, view.today) == (D0, D0 + timedelta(days=6), D0 + timedelta(4))
    assert [d.status for d in view.days] == [
        "ACTIVE",
        "ACTIVE",
        "MISSED",
        "ACTIVE",
        "TODAY_PENDING",
        "UPCOMING",
        "UPCOMING",
    ]
    assert (view.active_days, view.missed_days, view.longest_run) == (3, 1, 2)


async def test_days_before_the_first_open_are_not_missed(candidate) -> None:
    await _open(candidate, 3)
    view = await _calendar(candidate, now=at(3), period="week")
    assert [d.status for d in view.days[:3]] == ["BEFORE_START"] * 3


async def test_someone_who_never_opened_the_app_has_no_missed_days(candidate) -> None:
    view = await _calendar(candidate, now=at(10), period="month")
    assert view.missed_days == 0 and view.active_days == 0
    assert {d.status for d in view.days} <= {"BEFORE_START", "UPCOMING"}


async def test_a_milestone_shows_on_the_day_it_was_reached(candidate) -> None:
    for n in range(30):
        await _open(candidate, n)
    view = await _calendar(candidate, now=at(29), start=at(28).date(), end=at(29).date())
    assert [d.milestone_days for d in view.days] == [None, 30]


async def test_the_calendar_reads_only_its_own_candidate(candidate) -> None:
    other = uuid.uuid4()
    async with sessions(_seed_url())() as session, session.begin():
        await session.execute(
            text(
                "INSERT INTO users (id, pool, phone, status, locale) "
                "VALUES (:u, 'CANDIDATE', :p, 'ACTIVE', 'en')"
            ),
            {"u": str(other), "p": f"+9195{uuid.uuid4().int % 10**8:08d}"},
        )
    try:
        await _open(other, 0)
        view = await _calendar(candidate, now=at(0), period="week")
        assert view.active_days == 0
    finally:
        async with sessions(_seed_url())() as session, session.begin():
            await session.execute(text("DELETE FROM users WHERE id = :u"), {"u": str(other)})


# --- retention: one year ---------------------------------------------------------
async def _seed_days(user_id: uuid.UUID, *days: date) -> None:
    async with sessions(_seed_url())() as session, session.begin():
        for day in days:
            await session.execute(
                text("INSERT INTO streak_activity_days (user_id, activity_on) VALUES (:u, :d)"),
                {"u": str(user_id), "d": day},
            )


async def _purge(now: datetime) -> int:
    from app.modules.engagement import service

    async with sessions(APP_URL)() as session, session.begin():
        return await service.purge_expired_activity(session, now=now)


async def test_the_purge_keeps_exactly_a_year(candidate) -> None:
    """Holds `purge_streak_activity_days`' frozen number equal to the domain's."""
    today = _ist_today()
    kept = today - timedelta(days=ACTIVITY_RETENTION_DAYS)
    gone = kept - timedelta(days=1)
    await _seed_days(candidate, gone, kept, today)

    await _purge(datetime.now(UTC))

    assert await _days(candidate) == [kept, today]


async def test_a_clock_ahead_cannot_purge_a_retained_day(candidate) -> None:
    today = _ist_today()
    kept = today - timedelta(days=ACTIVITY_RETENTION_DAYS)
    await _seed_days(candidate, kept)

    await _purge(datetime.now(UTC) + timedelta(days=90))

    assert await _days(candidate) == [kept]


# --- HTTP -------------------------------------------------------------------------
async def test_the_calendar_over_http(client, mint_token) -> None:
    headers, subject = mint_token(pool="CANDIDATE", phone=f"+9194{uuid.uuid4().int % 10**8:08d}")
    try:
        await client.post("/api/v1/candidate/streak/me/check-in", headers=headers)

        week = await client.get("/api/v1/candidate/streak/me/calendar", headers=headers)
        assert week.status_code == 200
        body = week.json()
        assert len(body["days"]) == 7
        today = next(d for d in body["days"] if d["date"] == body["today"])
        assert today["status"] == "ACTIVE"
        assert body["active_days"] == 1

        year = await client.get(
            "/api/v1/candidate/streak/me/calendar", params={"period": "year"}, headers=headers
        )
        assert year.status_code == 200 and len(year.json()["days"]) == 366

        ranged = await client.get(
            "/api/v1/candidate/streak/me/calendar",
            params={"from": body["today"], "to": body["today"]},
            headers=headers,
        )
        assert ranged.status_code == 200 and len(ranged.json()["days"]) == 1

        refused = await client.get(
            "/api/v1/candidate/streak/me/calendar",
            params={"from": "2026-01-01", "to": "2027-06-01"},
            headers=headers,
        )
        assert refused.status_code == 422
        assert refused.json()["code"] == "streak_calendar_range_invalid"
    finally:
        async with sessions(_seed_url())() as session, session.begin():
            await session.execute(text("DELETE FROM users WHERE cognito_sub = :s"), {"s": subject})


async def test_a_business_user_has_no_calendar(client, mint_token, business_member) -> None:
    headers, _ = mint_token(pool="BUSINESS", subject=business_member["subject"])
    response = await client.get("/api/v1/candidate/streak/me/calendar", headers=headers)
    assert response.status_code == 403
