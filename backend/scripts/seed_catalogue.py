"""Write the price list and the course into `plans` and `courses`.

Idempotent. A changed price becomes a new version and the old one is
deactivated, never edited (`subscriptions.service.sync_plans`). The course is
written inactive while any lesson has no recorded media
(`courses.service.sync_catalogue`), so it cannot be sold.

**The prices are ours, not the client's** (`PLACEHOLDER_PRICING`). Outside
local and dev this refuses to seed them unless told to on the command line,
so a placeholder price list cannot reach a paying customer by a deploy script
that ran this without reading it.

    cd backend && .venv/Scripts/python.exe scripts/seed_catalogue.py
"""

from __future__ import annotations

import asyncio
import os
import sys

ALLOW_FLAG = "--allow-placeholder-prices"


async def main(argv: list[str]) -> int:
    from app.core.db import get_session_factory
    from app.modules.courses import service as courses_service
    from app.modules.subscriptions import service as subscriptions_service
    from app.modules.subscriptions.catalogue import CATALOGUE_VERSION, PLACEHOLDER_PRICING
    from app.settings import get_settings

    environment = get_settings().environment
    if PLACEHOLDER_PRICING and environment not in ("local", "dev") and ALLOW_FLAG not in argv:
        print(
            f"refusing to seed placeholder prices in environment={environment!r}.\n"
            f"They are not the client's. Pass {ALLOW_FLAG} if that is really intended.",
            file=sys.stderr,
        )
        return 2

    async with get_session_factory()() as session, session.begin():
        plans = await subscriptions_service.sync_plans(session)
        courses = await courses_service.sync_catalogue(session)
    flag = " (PLACEHOLDER prices)" if PLACEHOLDER_PRICING else ""
    print(f"catalogue {CATALOGUE_VERSION}{flag}: {plans} plan rows, {courses} course rows written")
    return 0


if __name__ == "__main__":
    os.environ.setdefault("ENVIRONMENT", "local")
    sys.exit(asyncio.run(main(sys.argv[1:])))
