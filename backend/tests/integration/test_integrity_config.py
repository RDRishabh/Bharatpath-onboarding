"""Integrity thresholds read from `config_values`, end to end.

**A thresholds row is global**: once inserted it applies to every evaluation in
the database, including other tests'. Each test here removes its row in a
`finally`, and dates it before `AS_OF` so it is in force for the simulated day
rather than for the real clock.
"""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from typing import Any

import pytest
from sqlalchemy import text

from tests.conftest import _seed_url, sessions

pytestmark = pytest.mark.integration

AS_OF = datetime(2026, 9, 13, tzinfo=UTC)
KEY = "integrity.thresholds"

#: Two full-time roles overlapping by six months -- MEDIUM by default.
OVERLAPPING: dict[str, Any] = {
    "roles": [
        {
            "title": "Engineer",
            "employer": "A",
            "months": 36,
            "seniority_level": "mid",
            "start_year": 2020,
            "start_month": 1,
            "end_year": 2023,
            "end_month": 1,
            "employment_type": "full_time",
        },
        {
            "title": "Engineer",
            "employer": "B",
            "months": 30,
            "seniority_level": "mid",
            "start_year": 2022,
            "start_month": 7,
            "end_year": 2025,
            "end_month": 1,
            "employment_type": "full_time",
        },
    ]
}


async def _version(user_id: uuid.UUID) -> uuid.UUID:
    from app.modules.resume import service as resume_service

    factory = sessions(_seed_url())
    async with factory() as session, session.begin():
        row = await resume_service.create_pasted_version(
            session, user_id=user_id, text=f"Two roles, overlapping. {uuid.uuid4()}"
        )
    return row.id


@pytest.fixture
async def candidate() -> uuid.UUID:
    user_id = uuid.uuid4()
    factory = sessions(_seed_url())
    async with factory() as session, session.begin():
        await session.execute(
            text(
                "INSERT INTO users (id, pool, phone, status, locale) "
                "VALUES (:u, 'CANDIDATE', :p, 'ACTIVE', 'en')"
            ),
            {"u": str(user_id), "p": f"+9199{uuid.uuid4().int % 10**8:08d}"},
        )
    return user_id


async def _with_row(document: dict[str, Any]) -> int:
    version = 1_000_000 + uuid.uuid4().int % 1_000_000
    factory = sessions(_seed_url())
    async with factory() as session, session.begin():
        await session.execute(
            text(
                "INSERT INTO config_values (id, key, value, version, effective_from) "
                "VALUES (:i, :k, CAST(:v AS jsonb), :n, :f)"
            ),
            {
                "i": str(uuid.uuid4()),
                "k": KEY,
                "v": json.dumps(document),
                "n": version,
                "f": datetime(2026, 1, 1, tzinfo=UTC),
            },
        )
    return version


async def _drop_row(version: int) -> None:
    factory = sessions(_seed_url())
    async with factory() as session, session.begin():
        await session.execute(
            text("DELETE FROM config_values WHERE key = :k AND version = :n"),
            {"k": KEY, "n": version},
        )


async def _evaluate(candidate: uuid.UUID, version_id: uuid.UUID) -> Any:
    from app.modules.integrity import service

    factory = sessions(_seed_url())
    async with factory() as session, session.begin():
        return await service.evaluate_version(
            session,
            candidate_id=candidate,
            resume_version_id=version_id,
            extracted=OVERLAPPING,
            visible_text="",
            as_of=AS_OF,
        )


async def test_without_a_row_the_defaults_apply_and_say_so(candidate: uuid.UUID) -> None:
    version_id = await _version(candidate)
    result = await _evaluate(candidate, version_id)
    assert result.highest_severity == "MEDIUM"

    factory = sessions(_seed_url())
    async with factory() as session:
        stored = await session.scalar(
            text("SELECT thresholds_version FROM integrity_checks WHERE resume_version_id = :v"),
            {"v": str(version_id)},
        )
    assert stored == "default"


async def test_a_row_changes_the_outcome_and_is_recorded(candidate: uuid.UUID) -> None:
    """The client tunes a number without a deploy, and every signal and check
    afterwards names the version that was in force."""
    row = await _with_row({"overlap_tolerance_months": 12})
    try:
        version_id = await _version(candidate)
        result = await _evaluate(candidate, version_id)
        assert result.signal_count == 0, "a six-month overlap fired under a twelve-month tolerance"

        factory = sessions(_seed_url())
        async with factory() as session:
            stored = await session.scalar(
                text(
                    "SELECT thresholds_version FROM integrity_checks WHERE resume_version_id = :v"
                ),
                {"v": str(version_id)},
            )
        assert stored == str(row)
    finally:
        await _drop_row(row)


async def test_a_bad_row_stops_the_check_rather_than_defaulting(candidate: uuid.UUID) -> None:
    """Loud and safe: the candidate is left unchecked, which discovery shows
    to nobody, rather than checked against numbers nobody intended."""
    from app.modules.integrity.service import IntegrityConfigError

    row = await _with_row({"overlap_tolerance_month": 12})
    try:
        version_id = await _version(candidate)
        with pytest.raises(IntegrityConfigError):
            await _evaluate(candidate, version_id)

        factory = sessions(_seed_url())
        async with factory() as session:
            checks = await session.scalar(
                text("SELECT count(*) FROM integrity_checks WHERE resume_version_id = :v"),
                {"v": str(version_id)},
            )
        assert checks == 0
    finally:
        await _drop_row(row)


async def test_a_row_dated_after_the_scoring_moment_does_not_apply(candidate: uuid.UUID) -> None:
    """Re-evaluating an old CV applies the thresholds in force when it was
    scored, not today's."""
    version = 1_000_000 + uuid.uuid4().int % 1_000_000
    factory = sessions(_seed_url())
    async with factory() as session, session.begin():
        await session.execute(
            text(
                "INSERT INTO config_values (id, key, value, version, effective_from) "
                "VALUES (:i, :k, CAST(:v AS jsonb), :n, :f)"
            ),
            {
                "i": str(uuid.uuid4()),
                "k": KEY,
                "v": json.dumps({"overlap_tolerance_months": 12}),
                "n": version,
                "f": datetime(2027, 1, 1, tzinfo=UTC),
            },
        )
    try:
        version_id = await _version(candidate)
        result = await _evaluate(candidate, version_id)
        assert result.highest_severity == "MEDIUM"
    finally:
        await _drop_row(version)
