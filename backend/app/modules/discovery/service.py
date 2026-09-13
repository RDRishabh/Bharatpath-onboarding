"""discovery - business rules and transaction boundaries

Masked search, access-window checks, reveal audit.

Services own the transaction. They never touch `Request`, and anything that
reveals private data writes its audit row on the same session before the
transaction closes.

Masked search itself is Day 13 and the reveal is Day 14. What lands here on
Day 9 is the rule both of them are built on: which candidates are visible at
all, with high-severity integrity suppression inside it.
"""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.pagination import clamp_limit
from app.modules.discovery import repository


async def visible_candidate_ids(
    session: AsyncSession, *, limit: int | None = None, after: uuid.UUID | None = None
) -> list[uuid.UUID]:
    return await repository.visible_candidate_ids(session, limit=clamp_limit(limit), after=after)


async def is_candidate_visible(session: AsyncSession, *, candidate_id: uuid.UUID) -> bool:
    return await repository.is_candidate_visible(session, candidate_id=candidate_id)


async def count_visible_at_or_above(session: AsyncSession, *, min_score: int) -> int:
    return await repository.count_visible_at_or_above(session, min_score=min_score)
