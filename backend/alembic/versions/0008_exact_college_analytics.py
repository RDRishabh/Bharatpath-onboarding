"""College analytics show exact numbers above the cohort floor.

The client decided on 2026-09-30 (answers-log 12.1) that a college sees exact
counts: a month with one hire says 1, not "withheld". Exact outcomes are what a
college pays for on its students' behalf. The consent residual that comes with
it -- a small cell beside a roster the college holds can point at one student
(blockers E28) -- was accepted the same day.

`analytics.domain.DEFAULT_FLOORS` now has `min_cell_size` 1, which withholds
nothing, but a database that ran `scripts/seed_config.py` already holds
`analytics.privacy` version 1 with `min_cell_size` 5, and the seed never
updates a key. So this inserts **version 2**, copying the live row and changing
only `min_cell_size`: the cohort floor and the median step stay whatever that
database has.

Nothing is inserted when there is no row (a fresh database before the seed,
which then writes the new defaults) or when the live row already shows exact
cells.

Revision ID: 0008_exact_college_analytics
Revises: 0007_streak_calendar
Create Date: 2026-09-30
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0008_exact_college_analytics"
down_revision: str | None = "0007_streak_calendar"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO config_values (id, key, value, version, effective_from, note)
        SELECT gen_random_uuid(),
               'analytics.privacy',
               live.value || '{"min_cell_size": 1}'::jsonb,
               (SELECT max(version) FROM config_values WHERE key = 'analytics.privacy') + 1,
               now(),
               'Client 2026-09-30 (answers-log 12.1): exact numbers above the cohort floor.'
          FROM (
                -- The row the app reads now: the highest version in effect.
                SELECT value
                  FROM config_values
                 WHERE key = 'analytics.privacy' AND effective_from <= now()
                 ORDER BY version DESC
                 LIMIT 1
               ) AS live
         WHERE coalesce((live.value ->> 'min_cell_size')::int, 5) > 1
        """
    )


def downgrade() -> None:
    raise NotImplementedError("Config rows are versioned forward; insert another version.")
