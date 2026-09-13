"""discovery - data access

Masked search, access-window checks, reveal audit.

All database access for this module lives here. Private to the module:
no other module may import it (import-linter contract `module-privacy`).

**Which candidates an employer can see at all is decided in one place: the
CTE below.** PRD 7.2 asks for high-severity integrity signals to suppress a
candidate "as a filter inside the discovery query, not a separate code
path" (plan.md Day 9). A separate filtering step is something the next
endpoint forgets to call; a CTE that every query is built on is not.
`test_discovery_suppression.py` fails the build if a query function here
stops using it.

The CTE reads `scores`, `integrity_checks` and `integrity_signals` directly
with SQL rather than going through those modules' services. That is a
deliberate exception to the usual cross-module rule, and it is the only way to
honour the one above: suppression has to be a join the planner can use an
index for, not a per-candidate round trip after the page is already built.
"""

from __future__ import annotations

import uuid

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

#: The candidates an employer may see, as a CTE named `visible_candidates`
#: with columns `(user_id, resume_version_id)`. Compose it with
#: `WITH {VISIBLE_CANDIDATES_CTE} SELECT ... FROM visible_candidates ...`.
#:
#: A candidate is visible only when all four hold:
#:
#: 1. **They have a score.** Their latest one decides which resume version
#:    is current.
#: 2. **Their account is active** and is a candidate account.
#: 3. **That version has been through the integrity rules.** Fail closed:
#:    integrity runs asynchronously after scoring, and without this condition a
#:    CV carrying injected instructions would be searchable until the check ran.
#:    Any rule version counts, so a rule bump does not empty the search.
#: 4. **They carry no HIGH signal that is OPEN or CONFIRMED.** Candidate-wide,
#:    not per version: uploading a clean CV must not wash away a signal a human
#:    has not yet looked at, or injecting and then re-uploading becomes a way
#:    to reach employers anyway. The predicate matches `ix_integrity_suppressing`
#:    character for character so the planner can use it.
VISIBLE_CANDIDATES_CTE: str = """
visible_candidates AS (
    SELECT latest.user_id, latest.resume_version_id
      FROM (
            SELECT DISTINCT ON (s.user_id) s.user_id, s.resume_version_id
              FROM scores s
             ORDER BY s.user_id, s.computed_at DESC, s.id DESC
           ) AS latest
      JOIN users u
        ON u.id = latest.user_id
       AND u.status = 'ACTIVE'
       AND u.pool = 'CANDIDATE'
     WHERE EXISTS (
             SELECT 1
               FROM integrity_checks c
              WHERE c.resume_version_id = latest.resume_version_id
           )
       AND NOT EXISTS (
             SELECT 1
               FROM integrity_signals g
              WHERE g.candidate_id = latest.user_id
                AND g.severity = 'HIGH' AND g.state IN ('OPEN', 'CONFIRMED')
           )
)
"""


async def visible_candidate_ids(
    session: AsyncSession, *, limit: int, after: uuid.UUID | None = None
) -> list[uuid.UUID]:
    """A page of visible candidate ids, keyset-paginated on the id.

    The foundation Day 13's masked search builds on. It returns ids only:
    everything an employer is shown about a candidate is a separate, audited
    read (invariant 7-prime).
    """
    # S608 is a false positive in both queries here: every string joined is a
    # module constant, and every value a caller supplies is a bind parameter.
    query = (
        "WITH "  # noqa: S608
        + VISIBLE_CANDIDATES_CTE
        + """
        SELECT user_id
          FROM visible_candidates
         WHERE CAST(:after AS uuid) IS NULL OR user_id > CAST(:after AS uuid)
         ORDER BY user_id
         LIMIT :limit
        """
    )
    result = await session.execute(
        text(query), {"after": str(after) if after is not None else None, "limit": limit}
    )
    return [row.user_id for row in result]


async def is_candidate_visible(session: AsyncSession, *, candidate_id: uuid.UUID) -> bool:
    """Whether one candidate passes the same rule as search.

    The reveal route on Day 14 must answer this before showing a profile,
    because a candidate can become suppressed between appearing in a result
    page and being clicked. It uses the identical CTE so that "in the search
    results" and "openable" can never disagree.
    """
    query = (
        "WITH " + VISIBLE_CANDIDATES_CTE + " SELECT 1 FROM visible_candidates WHERE user_id = :cid"  # noqa: S608
    )
    result = await session.execute(text(query), {"cid": str(candidate_id)})
    return result.first() is not None


async def count_visible_at_or_above(session: AsyncSession, *, min_score: int) -> int:
    """How many visible candidates' current score is at least `min_score`.

    Exact, and therefore **never returned to a client as it is**: the jobs
    service coarsens it before it leaves the building (`jobs/domain.py`). Built
    on the same CTE as search, so a suppressed or unchecked candidate is not
    counted -- a count that included them would reveal that they exist.
    """
    query = (
        "WITH "  # noqa: S608 - see the note on visible_candidate_ids
        + VISIBLE_CANDIDATES_CTE
        + """
        SELECT count(*)
          FROM visible_candidates vc
          JOIN LATERAL (
                SELECT s.raw_value
                  FROM scores s
                 WHERE s.user_id = vc.user_id
                 ORDER BY s.computed_at DESC, s.id DESC
                 LIMIT 1
               ) AS current ON true
         WHERE current.raw_value >= :min_score
        """
    )
    return int(await session.scalar(text(query), {"min_score": min_score}) or 0)
