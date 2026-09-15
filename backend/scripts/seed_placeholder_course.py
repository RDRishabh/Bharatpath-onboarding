"""Seed one placeholder course so the add-on scoring chain can be built.

**This is scaffolding, not content.** The client has not said who produces
courses, what format they are in, or what counts as completing one
(`docs/blockers.md` C1). This script unblocks the *build* -- Day 15's purchase
and completion flows, and Day 8's need for an add-on completion event to test
invariant 4-prime against -- without pretending the product question is answered.

The course it inserts is named so nobody can mistake it for real catalogue:
code `PLACEHOLDER-RESUME-BASICS`, and `active = false` so it cannot be listed
or bought by accident.

Refuses to run outside local and CI. A placeholder course that reached
production would award real points on invented criteria to real candidates.

    cd backend && .venv/Scripts/python.exe scripts/seed_placeholder_course.py
"""

from __future__ import annotations

import asyncio
import os
import sys
import uuid

COURSE_CODE = "PLACEHOLDER-RESUME-BASICS"
COURSE_TITLE = "[PLACEHOLDER] Resume Basics"

#: Deliberately mid-range, not the 30-point maximum. A placeholder sitting at
#: the cap would mask an off-by-one in the clamp: everything would look correct
#: while the bound was never actually exercised.
CONTRIBUTION_POINTS = 15

#: Zero. A placeholder with a price invites someone to test a payment flow
#: against it and conclude the catalogue is real.
PRICE_MINOR = 0


async def main() -> int:
    from sqlalchemy import text

    from app.core.db import get_session_factory
    from app.settings import get_settings

    settings = get_settings()
    environment = (settings.environment or "").lower()
    if environment not in ("local", "test", "ci"):
        print(
            f"refusing to seed a placeholder course in environment={environment!r}.\n"
            "It awards score contribution on invented completion criteria.",
            file=sys.stderr,
        )
        return 2

    async with get_session_factory()() as session, session.begin():
        existing = await session.scalar(
            text("SELECT id FROM courses WHERE code = :c"), {"c": COURSE_CODE}
        )
        if existing:
            print(f"already seeded: {COURSE_CODE} ({existing})")
            return 0

        course_id = uuid.uuid4()
        await session.execute(
            text(
                "INSERT INTO courses "
                "(id, code, title, price_minor, contribution_points, active, version) "
                "VALUES (:id, :code, :title, :price, :points, false, 1)"
            ),
            {
                "id": str(course_id),
                "code": COURSE_CODE,
                "title": COURSE_TITLE,
                "price": PRICE_MINOR,
                "points": CONTRIBUTION_POINTS,
            },
        )
        print(f"seeded {COURSE_CODE} ({course_id}) -> {CONTRIBUTION_POINTS} points, inactive")
        return 0


if __name__ == "__main__":
    os.environ.setdefault("ENVIRONMENT", "local")
    sys.exit(asyncio.run(main()))
