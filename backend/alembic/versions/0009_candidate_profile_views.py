"""Who viewed my profile: a candidate reads which organisations opened them.

Every reveal already writes a `candidate_view_events` row (invariant 7'). Until
now only the organisation that wrote it, and staff, could read it back. This
adds the candidate's side as one SECURITY DEFINER function, not a policy:

* **A candidate cannot read the log under RLS.** Its only policy is the
  tenant one, its partitions are revoked from the app role, and the
  `employers` candidate policy reaches only organisations with a job on the
  board. An organisation that opened a profile and never posted a job would
  have no name.
* **The function decides what leaves, not the caller.** One row per
  organisation: its name and when it last opened the profile. **Never the
  recruiter** (`actor_id`). Which person inside an organisation looked is
  that organisation's business, and naming them gives a candidate someone to
  contact outside the platform. Nor a count of opens: re-opens are the audit
  spine, not a measure of interest.
* **It reads only `current_candidate_id()`** and takes no candidate id, so it
  can only ever answer for the candidate the transaction is bound to. Bound
  to a tenant, or to nobody, it returns nothing.
* **It picks the lookback itself** (`LOOKBACK_DAYS`), so no caller can widen
  it.

Revision ID: 0009_candidate_profile_views
Revises: 0008_exact_college_analytics
Create Date: 2026-10-02
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0009_candidate_profile_views"
down_revision: str | None = "0008_exact_college_analytics"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

APP_ROLE = "bharatpath_app"

#: `discovery.domain.PROFILE_VIEWS_LOOKBACK_DAYS`, frozen here as SQL. A test
#: holds the two equal; a new period is a new migration.
LOOKBACK_DAYS = 90

#: One more than `app.core.pagination.MAX_PAGE_SIZE`: the service asks for a
#: page and one row to learn whether there is another.
MAX_ROWS = 101

_SIGNATURE = "candidate_profile_views(timestamptz, uuid, integer)"


def upgrade() -> None:
    # `(SELECT current_candidate_id())` is evaluated once, as an InitPlan, and
    # `ix_view_events_candidate` serves the scan in every partition. The
    # lookback lets the planner prune partitions older than it.
    op.execute(
        f"""
        CREATE OR REPLACE FUNCTION candidate_profile_views(
          p_before_viewed_at timestamptz, p_before_tenant uuid, p_limit integer
        )
        RETURNS TABLE (tenant_id uuid, employer_name text, last_viewed_at timestamptz)
        LANGUAGE sql STABLE SECURITY DEFINER
        SET search_path = public, pg_temp
        AS $fn$
          SELECT v.tenant_id, coalesce(emp.legal_name, t.name)::text, v.last_viewed_at
            FROM (
                  SELECT e.tenant_id, max(e.viewed_at) AS last_viewed_at
                    FROM candidate_view_events e
                   WHERE e.candidate_id = (SELECT current_candidate_id())
                     AND e.viewed_at >= now() - interval '{LOOKBACK_DAYS} days'
                   GROUP BY e.tenant_id
                 ) AS v
            JOIN tenants t
              ON t.id = v.tenant_id
             AND t.type = 'EMPLOYER'
            LEFT JOIN employers emp
              ON emp.tenant_id = v.tenant_id
           WHERE p_before_viewed_at IS NULL
              OR (v.last_viewed_at, v.tenant_id) < (p_before_viewed_at, p_before_tenant)
           ORDER BY v.last_viewed_at DESC, v.tenant_id DESC
           LIMIT LEAST(GREATEST(coalesce(p_limit, 0), 0), {MAX_ROWS})
        $fn$;
        """
    )
    op.execute(f"REVOKE ALL ON FUNCTION {_SIGNATURE} FROM PUBLIC")
    op.execute(f"GRANT EXECUTE ON FUNCTION {_SIGNATURE} TO {APP_ROLE}")


def downgrade() -> None:
    op.execute(f"DROP FUNCTION IF EXISTS {_SIGNATURE}")
