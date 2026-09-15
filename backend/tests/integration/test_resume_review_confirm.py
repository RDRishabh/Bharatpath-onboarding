"""Day 7 end to end: versions, review, edit, the confirm gate, and polling.

The service layer against a real Postgres, because most of what Day 7 promises
is enforced by the database rather than by Python: the chain cannot fork
because of a unique index, and `confirmed_at` is a latch because of a
conditional UPDATE. Testing either against a mock would prove the mock.
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import text

from tests.conftest import _seed_url, sessions

pytestmark = pytest.mark.integration


@pytest.fixture
async def candidate() -> uuid.UUID:
    """A user row to hang resumes off. Seeded as the migrator, like every
    other fixture -- the app role is genuinely subject to RLS."""
    user_id = uuid.uuid4()
    factory = sessions(_seed_url())
    async with factory() as session, session.begin():
        await session.execute(
            text(
                "INSERT INTO users (id, cognito_sub, pool, phone, status, locale) "
                "VALUES (:id, :sub, 'CANDIDATE', :phone, 'ACTIVE', 'en')"
            ),
            {
                "id": str(user_id),
                "sub": f"local|{user_id}",
                "phone": f"+9199{uuid.uuid4().int % 10**8:08d}",
            },
        )
    return user_id


PASTED = (
    "Priya Sharma - Senior Backend Engineer, Bengaluru\n"
    "Infosys, Senior Developer, 2019 to 2024\n"
    "B.Tech Computer Science, VIT Vellore, 2015\n"
    "Skills: Python, PostgreSQL, Kubernetes"
)
CORRECTED = (
    "Priya Sharma - Principal Backend Engineer, Bengaluru\n"
    "Infosys, Principal Developer, 2019 to 2024\n"
    "B.Tech Computer Science, VIT Vellore, 2015\n"
    "Skills: Python, PostgreSQL, Kubernetes, Terraform"
)


async def _paste(user_id: uuid.UUID, text_body: str = PASTED):
    from app.modules.resume import service

    factory = sessions(_seed_url())
    async with factory() as session, session.begin():
        return await service.create_pasted_version(session, user_id=user_id, text=text_body)


async def _edit(user_id: uuid.UUID, version_id: uuid.UUID, **kwargs):
    from app.modules.resume import service
    from app.modules.resume.schemas import ResumeEditRequest

    factory = sessions(_seed_url())
    async with factory() as session, session.begin():
        return await service.edit_version(
            session,
            user_id=user_id,
            resume_version_id=version_id,
            payload=ResumeEditRequest(**kwargs),
        )


async def _confirm(user_id: uuid.UUID, version_id: uuid.UUID):
    from app.modules.resume import service

    factory = sessions(_seed_url())
    async with factory() as session, session.begin():
        return await service.confirm_version(session, user_id=user_id, resume_version_id=version_id)


# --- the confirm gate, SRS 1.4.4 -----------------------------------------
async def test_a_new_version_is_not_confirmed(candidate: uuid.UUID) -> None:
    """Every path into a version produces an unconfirmed one. The gate is not
    something the candidate opts into -- it is the only way through."""
    row = await _paste(candidate)
    assert row.confirmed_at is None


async def test_an_unconfirmed_resume_is_not_scorable(candidate: uuid.UUID) -> None:
    """**The gate itself.** A version exists; scoring still cannot have it."""
    from app.modules.resume import service
    from app.modules.resume.service import ResumeNotConfirmedError

    await _paste(candidate)

    factory = sessions(_seed_url())
    async with factory() as session:
        with pytest.raises(ResumeNotConfirmedError):
            await service.get_scorable_version(session, user_id=candidate)


async def test_confirming_makes_it_scorable(candidate: uuid.UUID) -> None:
    from app.modules.resume import service

    row = await _paste(candidate)
    await _confirm(candidate, row.id)

    factory = sessions(_seed_url())
    async with factory() as session:
        scorable = await service.get_scorable_version(session, user_id=candidate)
    assert scorable.id == row.id


async def test_confirming_is_a_latch_and_not_an_assignment(candidate: uuid.UUID) -> None:
    """Confirming twice is a retry, not a second confirmation. The timestamp
    is when the candidate approved the content -- a fact about them, not about
    how many times their phone lost signal mid-request."""
    row = await _paste(candidate)

    first, already_first = await _confirm(candidate, row.id)
    second, already_second = await _confirm(candidate, row.id)

    assert already_first is False
    assert already_second is True
    assert first.confirmed_at == second.confirmed_at


async def test_confirming_emits_the_event_scoring_consumes(candidate: uuid.UUID) -> None:
    """`version_confirmed`, and only on the transition. A second confirm must
    not emit again or an at-least-once consumer would re-score for nothing."""
    row = await _paste(candidate)
    await _confirm(candidate, row.id)
    await _confirm(candidate, row.id)

    factory = sessions(_seed_url())
    async with factory() as session:
        count = await session.scalar(
            text(
                "SELECT count(*) FROM outbox "
                "WHERE event_type = 'resume.version_confirmed' AND aggregate_id = :a"
            ),
            {"a": str(row.id)},
        )
    assert count == 1


async def test_one_candidate_cannot_confirm_anothers_version(candidate: uuid.UUID) -> None:
    """404, not 403. A 403 would confirm the version exists."""
    from app.modules.resume.service import VersionNotFoundError

    row = await _paste(candidate)

    other = uuid.uuid4()
    factory = sessions(_seed_url())
    async with factory() as session, session.begin():
        await session.execute(
            text(
                "INSERT INTO users (id, pool, phone, status, locale) "
                "VALUES (:u, 'CANDIDATE', :p, 'ACTIVE', 'en')"
            ),
            {"u": str(other), "p": f"+9199{uuid.uuid4().int % 10**8:08d}"},
        )

    with pytest.raises(VersionNotFoundError):
        await _confirm(other, row.id)


# --- editing creates versions, never updates them -------------------------
async def test_an_edit_creates_a_new_version_and_leaves_the_old_one_intact(
    candidate: uuid.UUID,
) -> None:
    """Invariant 1 depends on this: a score points at the exact version it was
    computed from, so that version can never change underneath it."""
    original = await _paste(candidate)
    edited = await _edit(candidate, original.id, text=CORRECTED)

    assert edited.id != original.id
    assert edited.supersedes_id == original.id
    assert edited.source == "EDIT"

    factory = sessions(_seed_url())
    async with factory() as session:
        still_there = await session.scalar(
            text("SELECT parsed->>'raw_text' FROM resume_versions WHERE id = :v"),
            {"v": str(original.id)},
        )
    assert still_there == PASTED, "the superseded version's content changed"


async def test_editing_a_confirmed_version_does_not_inherit_its_confirmation(
    candidate: uuid.UUID,
) -> None:
    """**The side door the gate exists to close.** If a correction inherited
    confirmation, editing would be a way to change scored content without
    anyone reviewing it -- SRS 1.4.4 bypassed while appearing to hold."""
    original = await _paste(candidate)
    await _confirm(candidate, original.id)

    edited = await _edit(candidate, original.id, text=CORRECTED)

    assert edited.confirmed_at is None


async def test_the_last_confirmed_version_stays_scorable_until_a_correction_is_confirmed(
    candidate: uuid.UUID,
) -> None:
    """A candidate who starts an edit and abandons it half way still has the
    resume they approved. An unconfirmed correction must not silently replace
    a confirmed one, and must not leave them with nothing either."""
    from app.modules.resume import service

    original = await _paste(candidate)
    await _confirm(candidate, original.id)
    edited = await _edit(candidate, original.id, text=CORRECTED)

    factory = sessions(_seed_url())
    async with factory() as session:
        scorable = await service.get_scorable_version(session, user_id=candidate)
    assert scorable.id == original.id

    await _confirm(candidate, edited.id)
    async with factory() as session:
        scorable = await service.get_scorable_version(session, user_id=candidate)
    assert scorable.id == edited.id


async def test_an_edit_records_that_a_human_wrote_it(candidate: uuid.UUID) -> None:
    """A replay must be able to tell extracted text from asserted text. They
    are different kinds of evidence and invariant 1 stores the difference."""
    original = await _paste(candidate)
    edited = await _edit(candidate, original.id, text=CORRECTED)

    factory = sessions(_seed_url())
    async with factory() as session:
        parsed = await session.scalar(
            text("SELECT parsed FROM resume_versions WHERE id = :v"), {"v": str(edited.id)}
        )
    assert parsed["extractor"]["parser"] == "candidate-edit"
    assert parsed["extractor"]["edit_generation"] == 1
    assert parsed["extractor"]["origin"]["parser"] == "paste"


async def test_an_edit_may_replace_pasted_text_with_the_structured_form(
    candidate: uuid.UUID,
) -> None:
    """A candidate whose CV parsed into unusable text can correct it by filling
    the form instead. Both shapes are stored the way scoring already reads
    them, so this is a correction and not a second intake path."""
    from app.modules.resume.schemas import ManualExperience, ManualResumeRequest

    original = await _paste(candidate)
    edited = await _edit(
        candidate,
        original.id,
        structured=ManualResumeRequest(
            full_name="Priya Sharma",
            headline="Principal Backend Engineer",
            experience=[
                ManualExperience(
                    employer="Infosys", title="Principal Developer", start_year=2019, end_year=2024
                )
            ],
            education=[],
            skills=["Python", "PostgreSQL"],
        ),
    )

    factory = sessions(_seed_url())
    async with factory() as session:
        parsed = await session.scalar(
            text("SELECT parsed FROM resume_versions WHERE id = :v"), {"v": str(edited.id)}
        )
    assert parsed["full_name"] == "Priya Sharma"
    assert "raw_text" not in parsed, "the replaced text was carried forward"


# --- the chain stays linear ------------------------------------------------
async def test_a_superseded_version_cannot_be_edited_again(candidate: uuid.UUID) -> None:
    """Two versions superseding one parent would fork the chain, and "the
    candidate's current resume" would stop having a single answer."""
    from app.modules.resume.service import VersionSupersededError

    original = await _paste(candidate)
    await _edit(candidate, original.id, text=CORRECTED)

    with pytest.raises(VersionSupersededError):
        await _edit(candidate, original.id, text=CORRECTED + "\nAlso: Go")


async def test_a_superseded_version_cannot_be_confirmed(candidate: uuid.UUID) -> None:
    """The gate asks whether a version is confirmed, not whether it is
    current. So confirming a replaced one would make content the candidate has
    already moved on from eligible for scoring."""
    from app.modules.resume.service import VersionSupersededError

    original = await _paste(candidate)
    await _edit(candidate, original.id, text=CORRECTED)

    with pytest.raises(VersionSupersededError):
        await _confirm(candidate, original.id)


async def test_the_database_refuses_a_fork_even_without_the_service_check(
    candidate: uuid.UUID,
) -> None:
    """**The service check is for the error message; this is the guarantee.**

    Two concurrent edits would both read "not yet superseded" and both write,
    and the service alone cannot stop that. Asserted by writing the second row
    directly, which is what the losing request would do.
    """
    from sqlalchemy.exc import IntegrityError

    original = await _paste(candidate)
    await _edit(candidate, original.id, text=CORRECTED)

    factory = sessions(_seed_url())
    with pytest.raises(IntegrityError):
        async with factory() as session, session.begin():
            await session.execute(
                text(
                    "INSERT INTO resume_versions (id, user_id, source, parsed, supersedes_id) "
                    "VALUES (:i, :u, 'EDIT', '{}'::jsonb, :s)"
                ),
                {"i": str(uuid.uuid4()), "u": str(candidate), "s": str(original.id)},
            )


async def test_many_versions_may_have_no_parent(candidate: uuid.UUID) -> None:
    """The unique index constrains parent links only. A candidate who uploads
    three separate CVs has three chain heads, and that is ordinary."""
    for _ in range(3):
        await _paste(candidate)

    factory = sessions(_seed_url())
    async with factory() as session:
        heads = await session.scalar(
            text(
                "SELECT count(*) FROM resume_versions WHERE user_id = :u AND supersedes_id IS NULL"
            ),
            {"u": str(candidate)},
        )
    assert heads == 3


# --- review and history ----------------------------------------------------
async def test_review_returns_the_content_that_will_be_scored(candidate: uuid.UUID) -> None:
    """The candidate cannot meaningfully confirm what they have not seen, so
    this is the one read that returns `parsed` whole."""
    from app.modules.resume import service

    row = await _paste(candidate)

    factory = sessions(_seed_url())
    async with factory() as session:
        version, superseded = await service.get_version_for_review(
            session, user_id=candidate, resume_version_id=row.id
        )
    assert version.parsed["raw_text"] == PASTED
    assert superseded is False


async def test_review_reports_a_version_that_has_been_replaced(candidate: uuid.UUID) -> None:
    from app.modules.resume import service

    original = await _paste(candidate)
    await _edit(candidate, original.id, text=CORRECTED)

    factory = sessions(_seed_url())
    async with factory() as session:
        _, superseded = await service.get_version_for_review(
            session, user_id=candidate, resume_version_id=original.id
        )
    assert superseded is True


async def test_one_candidate_cannot_review_anothers_version(candidate: uuid.UUID) -> None:
    from app.modules.resume import service
    from app.modules.resume.service import VersionNotFoundError

    row = await _paste(candidate)

    factory = sessions(_seed_url())
    async with factory() as session:
        with pytest.raises(VersionNotFoundError):
            await service.get_version_for_review(
                session, user_id=uuid.uuid4(), resume_version_id=row.id
            )


async def test_history_is_newest_first_and_flags_what_is_superseded(
    candidate: uuid.UUID,
) -> None:
    from app.modules.resume import service

    original = await _paste(candidate)
    edited = await _edit(candidate, original.id, text=CORRECTED)

    factory = sessions(_seed_url())
    async with factory() as session:
        history = await service.list_versions(session, user_id=candidate)

    assert [row.id for row, _ in history] == [edited.id, original.id]
    assert [superseded for _, superseded in history] == [False, True]


async def test_history_holds_only_this_candidates_versions(candidate: uuid.UUID) -> None:
    from app.modules.resume import service

    await _paste(candidate)

    factory = sessions(_seed_url())
    async with factory() as session:
        history = await service.list_versions(session, user_id=uuid.uuid4())
    assert history == []
