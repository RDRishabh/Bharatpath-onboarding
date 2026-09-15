"""Baseline schema: tables, RLS, append-only grants, publish gate.

This migration does four things the ORM cannot express, and each one is an
invariant rather than a nicety:

  1. **Row-Level Security** on every tenant-scoped table (invariant 7, SRS
     2.24.7). Policy: `tenant_id = current_setting('app.tenant_id')::uuid`.
  2. **Append-only `audit_events`** - UPDATE and DELETE revoked from the
     application role (invariant 7-prime, PRD rule 9).
  3. **INSERT-only `scores`** - no UPDATE, no DELETE (invariant 3). A score is
     not human-editable, directly or indirectly.
  4. **The publish gate as a Postgres trigger** (invariant 8) so a job cannot
     reach PUBLISHED for an unverified employer even via a direct repository
     call that bypasses the domain service.

Revision ID: 0001_baseline
Create Date: 2026-08-30
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_baseline"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

APP_ROLE = "bharatpath_app"

# Every table that gets the tenant-isolation policy. Adding a tenant-scoped
# table without listing it here is caught by
# tests/invariants/test_invariant_07_rls.py, which reads the ORM metadata and
# fails on any tenant_id column that is neither policied nor deliberately
# exempted below.
TENANT_SCOPED_TABLES = (
    "employers",
    "kyb_submissions",
    "kyb_documents",
    "jobs",
    "applications",
    "candidate_view_events",
    "colleges",
    "college_seats",
    "roster_imports",
    "roster_entries",
    "student_consents",
    "referral_codes",
)

# Tables that carry a tenant_id but must NOT get the policy. Each exemption is
# a deliberate decision with a reason, and the invariant test requires the
# reason to exist -- an unexplained exemption is how tenant isolation quietly
# stops applying.
RLS_EXEMPT: dict[str, str] = {
    "memberships": (
        "Chicken and egg: this table is read to DETERMINE app.tenant_id. At "
        "the moment it is queried the setting is not yet established, so the "
        "policy would match nothing and every request would fail to "
        "authenticate. Isolation here comes from the query always filtering "
        "on the authenticated user_id, which the caller cannot forge."
    ),
    "tenant_suspensions": (
        "Read during authentication, before tenant context exists -- same "
        "ordering problem as memberships. Written only by platform admins on "
        "the bypass engine, and every such write is audited."
    ),
    "audit_events": (
        "tenant_id is nullable here: candidate and platform-admin actions "
        "have no tenant. A WITH CHECK policy would reject those inserts and "
        "silently break the audit trail -- which is the one thing that must "
        "never fail to write. Reads go through the admin bypass engine."
    ),
}


def upgrade() -> None:
    _create_core_tables()
    _create_identity_tables()
    _create_candidate_tables()
    _create_employer_tables()
    _create_billing_tables()
    _create_college_tables()

    _enable_row_level_security()
    _apply_append_only_grants()
    _create_publish_gate_trigger()
    _create_published_at_stamp()
    _create_candidate_marketplace_access()
    _create_application_guard()
    _create_candidate_search_projection()


def downgrade() -> None:
    # Deliberately not implemented. This is the baseline; "downgrading" it
    # means dropping every table in the product. If you need to start over in
    # development, recreate the database.
    raise NotImplementedError("The baseline migration is not reversible.")


# ---------------------------------------------------------------------------
# Cross-cutting
# ---------------------------------------------------------------------------
def _create_core_tables() -> None:
    op.create_table(
        "audit_events",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), index=True),
        sa.Column("actor_role", sa.String(64), nullable=False),
        sa.Column("action", sa.String(64), nullable=False, index=True),
        sa.Column("target_type", sa.String(64), nullable=False),
        sa.Column("target_id", sa.String(64), index=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), index=True),
        sa.Column("request_id", sa.String(64)),
        sa.Column(
            "metadata",
            postgresql.JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_audit_actor_time", "audit_events", ["actor_id", "occurred_at"])
    op.create_index("ix_audit_action_time", "audit_events", ["action", "occurred_at"])
    op.create_index("ix_audit_tenant_time", "audit_events", ["tenant_id", "occurred_at"])

    op.create_table(
        "idempotency_keys",
        sa.Column("key", sa.String(255), primary_key=True),
        sa.Column("endpoint", sa.String(255), primary_key=True),
        sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("state", sa.String(16), nullable=False, server_default="IN_PROGRESS"),
        sa.Column("response_status", sa.Integer),
        sa.Column("response_body", postgresql.JSONB),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False, index=True),
    )

    op.create_table(
        "outbox",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("event_type", sa.String(128), nullable=False, index=True),
        sa.Column("aggregate_type", sa.String(64), nullable=False),
        sa.Column("aggregate_id", sa.String(64), nullable=False),
        sa.Column("payload", postgresql.JSONB, nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.Column("attempts", sa.Integer, nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
            index=True,
        ),
    )
    # The relay polls this. A partial index keeps the scan proportional to the
    # backlog rather than to total history.
    op.create_index(
        "ix_outbox_unpublished",
        "outbox",
        ["created_at"],
        postgresql_where=sa.text("published_at IS NULL"),
    )

    op.create_table(
        "config_values",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("key", sa.String(128), nullable=False, index=True),
        sa.Column("value", postgresql.JSONB, nullable=False),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column(
            "effective_from",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("note", sa.Text),
        sa.UniqueConstraint("key", "version", name="uq_config_key_version"),
    )


# ---------------------------------------------------------------------------
# The rest of the schema is created from the ORM metadata, because keeping two
# hand-written definitions in sync is how they drift. Only the constructs
# SQLAlchemy cannot express -- RLS, grants, triggers -- are written by hand.
# ---------------------------------------------------------------------------
def _create_from_metadata(*table_names: str) -> None:
    # Load the models here rather than trusting the caller. This migration
    # failed in CI with KeyError: 'users' because env.py imported
    # `app.modules` (the packages) but never `<module>.models` (the ORM
    # classes), so the metadata was empty. Idempotent - imports are cached.
    from app.core.metadata import load_all_models

    metadata = load_all_models()
    bind = op.get_bind()
    missing = [n for n in table_names if n not in metadata.tables]
    if missing:
        raise RuntimeError(
            f"No ORM model registered for: {missing}. "
            "Metadata is incomplete - see app/core/metadata.py."
        )

    metadata.create_all(
        bind=bind,
        tables=[metadata.tables[name] for name in table_names],
        checkfirst=False,
    )


def _create_identity_tables() -> None:
    _create_from_metadata("users", "tenants", "memberships", "tenant_suspensions")


def _create_candidate_tables() -> None:
    _create_from_metadata(
        "resume_files",
        "resume_versions",
        "resume_extractions",
        "scores",
        "integrity_signals",
        "integrity_checks",
        "device_checks",
        "dsr_requests",
        "user_streaks",
        "streak_point_events",
        "candidate_profiles",
        "candidate_search_documents",
    )


def _create_employer_tables() -> None:
    _create_from_metadata(
        "employers",
        "kyb_submissions",
        "kyb_documents",
        "jobs",
        "applications",
        "application_events",
        "candidate_view_events",
    )


def _create_billing_tables() -> None:
    _create_from_metadata(
        "payments",
        "entitlements",
        "plans",
        "subscriptions",
        "subscription_events",
        "upi_mandates",
        "courses",
        "course_purchases",
        "course_completions",
        "interview_sessions",
        "interview_answers",
    )


def _create_college_tables() -> None:
    _create_from_metadata(
        "colleges",
        "college_seats",
        "roster_imports",
        "roster_entries",
        "student_consents",
        "referral_codes",
    )


# ---------------------------------------------------------------------------
# Invariant 7 / SRS 2.24.7 -- Row-Level Security
# ---------------------------------------------------------------------------
def _enable_row_level_security() -> None:
    """Second line of tenant isolation.

    `FORCE ROW LEVEL SECURITY` matters: without it the policy would not apply
    to the table owner, and a future migration that changed ownership would
    silently disable isolation. With FORCE, only BYPASSRLS gets past -- which
    is exactly the one role we grant deliberately and audit.

    `current_setting(..., true)` (missing_ok) means an unset `app.tenant_id`
    yields NULL, the comparison is NULL, and **no rows are returned**. Failing
    closed is the point: forgetting to set the tenant shows nothing rather
    than everything.
    """
    for table in TENANT_SCOPED_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(
            f"""
            CREATE POLICY {table}_tenant_isolation ON {table}
              USING (
                tenant_id = NULLIF(
                  current_setting('app.tenant_id', true), ''
                )::uuid
              )
              WITH CHECK (
                tenant_id = NULLIF(
                  current_setting('app.tenant_id', true), ''
                )::uuid
              )
            """
        )


# ---------------------------------------------------------------------------
# Invariants 3 and 7-prime -- grants that make tables append-only
# ---------------------------------------------------------------------------
def _apply_append_only_grants() -> None:
    # Invariant 7-prime: the audit trail is append-only from the application
    # path. PRD rule 9 requires it and SRS 2.24.5 repeats it. Revoking at the
    # role level means even a bug cannot rewrite history.
    op.execute(f"REVOKE UPDATE, DELETE ON audit_events FROM {APP_ROLE}")
    op.execute(f"REVOKE UPDATE, DELETE ON candidate_view_events FROM {APP_ROLE}")

    # Invariant 3: the score is never human-editable, directly or indirectly.
    # No route accepts a score value, and the database will not accept one
    # either. Score history is every row of this table, never mutated.
    op.execute(f"REVOKE UPDATE, DELETE ON scores FROM {APP_ROLE}")

    # Append-only event logs. Rewriting a stage transition or a subscription
    # transition after the fact would make both audit trails worthless.
    op.execute(f"REVOKE UPDATE, DELETE ON application_events FROM {APP_ROLE}")
    op.execute(f"REVOKE UPDATE, DELETE ON subscription_events FROM {APP_ROLE}")

    # Score-moving writes (invariant 3's blast radius). Now that add-ons move
    # the score, a mutable completion row is a mutable score.
    op.execute(f"REVOKE UPDATE, DELETE ON course_completions FROM {APP_ROLE}")

    # The engagement-points ledger. Not a score, but it is a balance a
    # candidate sees, and one that could be rewritten would explain nothing.
    op.execute(f"REVOKE UPDATE, DELETE ON streak_point_events FROM {APP_ROLE}")

    # The masked-search document is written by the trigger on `scores` and by
    # nothing else (`_create_candidate_search_projection`). The app role reads
    # it; a write from the application would be a card the score does not
    # support. Not even INSERT, unlike the tables above.
    op.execute(f"REVOKE INSERT, UPDATE, DELETE ON candidate_search_documents FROM {APP_ROLE}")


# ---------------------------------------------------------------------------
# Invariant 8 -- no job publish before KYB approval
# ---------------------------------------------------------------------------
def _create_publish_gate_trigger() -> None:
    """PRD rule 7 / SRS 1.11.4, enforced below the service layer.

    The domain service checks this too. The trigger exists because the
    invariant test bypasses the API *and* the service and calls the repository
    directly -- and it must still fail. A gate that only lives in application
    code is a gate that a future refactor can route around.

    Note this fires regardless of `kyb.require_approval`. With auto-approval
    on, employers reach APPROVED immediately and the gate passes trivially;
    the invariant test runs with the flag off so the gate stays genuinely
    exercised whatever production is set to.
    """
    # SECURITY DEFINER is required, not decorative. `employers` carries FORCE
    # ROW LEVEL SECURITY, so without it this SELECT would be filtered by the
    # caller's tenant policy -- and in the invariant test, which inserts
    # directly with no tenant context set, the lookup would return no row.
    # The gate would then fire for the *wrong reason* (employer invisible
    # rather than employer unverified), which is a passing test that proves
    # nothing. Running as the owner makes the check read what is actually
    # there.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION enforce_kyb_before_publish()
        RETURNS TRIGGER
        SECURITY DEFINER
        SET search_path = public, pg_temp
        AS $$
        DECLARE
          employer_status TEXT;
        BEGIN
          IF NEW.status <> 'PUBLISHED' THEN
            RETURN NEW;
          END IF;

          IF TG_OP = 'UPDATE' AND OLD.status = 'PUBLISHED' THEN
            RETURN NEW;   -- already live; this is an edit, not a publish
          END IF;

          SELECT kyb_status INTO employer_status
            FROM employers WHERE tenant_id = NEW.tenant_id;

          IF employer_status IS DISTINCT FROM 'APPROVED' THEN
            RAISE EXCEPTION
              'KYB_REQUIRED: employer % is not verified (kyb_status=%)',
              NEW.tenant_id, COALESCE(employer_status, 'NONE')
              USING ERRCODE = 'check_violation';
          END IF;

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_enforce_kyb_before_publish
          BEFORE INSERT OR UPDATE OF status ON jobs
          FOR EACH ROW EXECUTE FUNCTION enforce_kyb_before_publish();
        """
    )


# ---------------------------------------------------------------------------
# Day 11 -- a published job always knows when it was published
# ---------------------------------------------------------------------------
def _create_published_at_stamp() -> None:
    """Stamp `published_at` on the way into PUBLISHED, in the database.

    The candidate board pages on `(published_at, id)`, and a keyset cursor over
    a nullable column skips or repeats rows. The service already sets the
    column; this makes it true for every other writer too -- fixtures and data
    migrations insert PUBLISHED rows directly. `ck_jobs_published_at` then
    holds it. A separate trigger from the KYB gate, so that function keeps
    doing exactly one thing.
    """
    op.execute(
        """
        CREATE OR REPLACE FUNCTION stamp_published_at()
        RETURNS TRIGGER
        SET search_path = public, pg_temp
        AS $$
        BEGIN
          IF NEW.status = 'PUBLISHED' AND NEW.published_at IS NULL THEN
            NEW.published_at := now();
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_stamp_published_at
          BEFORE INSERT OR UPDATE OF status ON jobs
          FOR EACH ROW EXECUTE FUNCTION stamp_published_at();
        """
    )


# ---------------------------------------------------------------------------
# Day 11 -- what a candidate may read and write under Row-Level Security
# ---------------------------------------------------------------------------
#: Policies added for candidates, who belong to no tenant. Listed so the count
#: `reset_local_db.sh` prints can be reconciled: 12 tenant policies plus these.
CANDIDATE_POLICIES = (
    "jobs_candidate_board",
    "employers_candidate_board",
    "applications_candidate_read",
    "applications_candidate_apply",
    "applications_candidate_update",
)


def _create_candidate_marketplace_access() -> None:
    """A candidate reads the job board and their own applications, and nothing else.

    The tenant policy cannot serve a candidate: they have no tenant, and the
    board is every employer's published jobs at once. Binding `app.tenant_id`
    to each employer in turn would be the tenant id coming from somewhere other
    than a membership, which is the thing SRS 2.24.7 forbids.

    So a second, narrower identity is bound instead: `app.user_id`, set by the
    candidate services from the verified token (`set_transaction_user`).
    `current_candidate_id()` turns it into a user id **only** when

      * no tenant is bound -- a business transaction always binds one, so an
        employer never sees another employer's jobs through these policies;
      * the id is an ACTIVE account in the CANDIDATE pool.

    Anything else yields NULL, every policy below matches nothing, and the
    fail-closed property of the tenant policies is kept: a session that binds
    nothing still reads no jobs (`test_unset_tenant_returns_no_rows_not_all_rows`).

    **Permissive policies OR together**, so these add reach and remove none.
    They grant SELECT on the board, and INSERT/UPDATE on the candidate's own
    applications only. Nothing lets a candidate write a job or an employer.

    `job_accepts_applications` is SECURITY DEFINER for the same reason as the
    KYB trigger, plus one more: an INSERT check on `applications` that read
    `jobs` under RLS would expand the `jobs` policy, which reads `applications`
    -- Postgres refuses that as infinite recursion. The function is opaque to
    the rewriter and reports only whether a job is live, which is public.
    """
    op.execute(
        """
        CREATE OR REPLACE FUNCTION current_candidate_id()
        RETURNS uuid
        LANGUAGE sql STABLE
        SET search_path = public, pg_temp
        AS $$
          SELECT u.id
            FROM users u
           WHERE NULLIF(current_setting('app.tenant_id', true), '') IS NULL
             AND u.id = NULLIF(current_setting('app.user_id', true), '')::uuid
             AND u.pool = 'CANDIDATE'
             AND u.status = 'ACTIVE'
        $$;
        """
    )
    op.execute(
        """
        CREATE OR REPLACE FUNCTION job_accepts_applications(p_job_id uuid)
        RETURNS boolean
        LANGUAGE sql STABLE
        SECURITY DEFINER
        SET search_path = public, pg_temp
        AS $$
          SELECT EXISTS (
            SELECT 1 FROM jobs WHERE id = p_job_id AND status = 'PUBLISHED'
          )
        $$;
        """
    )

    # `(SELECT current_candidate_id())` rather than a bare call: the subquery
    # form is evaluated once per statement as an InitPlan, not once per row.
    #
    # The board shows PUBLISHED jobs, plus any job the candidate has applied
    # to -- otherwise an application to a job that later closed would lose
    # its title on the candidate's own Application Board. Board queries still
    # filter on status explicitly for that reason.
    op.execute(
        """
        CREATE POLICY jobs_candidate_board ON jobs FOR SELECT
          USING (
            (SELECT current_candidate_id()) IS NOT NULL
            AND (
              status = 'PUBLISHED'
              OR EXISTS (
                SELECT 1 FROM applications a
                 WHERE a.job_id = jobs.id
                   AND a.candidate_id = (SELECT current_candidate_id())
              )
            )
          )
        """
    )
    # An employer's name, for employers with a job the candidate can see. The
    # subquery on `jobs` runs under the policy above, so this cannot reach an
    # employer with nothing on the board.
    op.execute(
        """
        CREATE POLICY employers_candidate_board ON employers FOR SELECT
          USING (
            (SELECT current_candidate_id()) IS NOT NULL
            AND EXISTS (SELECT 1 FROM jobs j WHERE j.tenant_id = employers.tenant_id)
          )
        """
    )
    op.execute(
        """
        CREATE POLICY applications_candidate_read ON applications FOR SELECT
          USING (candidate_id = (SELECT current_candidate_id()))
        """
    )
    # Applying is checked in the service too; this is the version a direct
    # repository call cannot route around. The tenant the row is filed under is
    # held by the composite foreign key to `jobs (id, tenant_id)`, not here.
    op.execute(
        """
        CREATE POLICY applications_candidate_apply ON applications FOR INSERT
          WITH CHECK (
            candidate_id = (SELECT current_candidate_id())
            AND stage = 'SUBMITTED'
            AND job_accepts_applications(job_id)
          )
        """
    )
    # No job-status check on update: withdrawing from a job that has since
    # closed must still work.
    op.execute(
        """
        CREATE POLICY applications_candidate_update ON applications FOR UPDATE
          USING (candidate_id = (SELECT current_candidate_id()))
          WITH CHECK (candidate_id = (SELECT current_candidate_id()))
        """
    )


# ---------------------------------------------------------------------------
# Day 12 -- the hiring pipeline, held below the service
# ---------------------------------------------------------------------------
def _create_application_guard() -> None:
    """The stage machine and the two-sided hire, for every writer.

    The service checks all of this and says what went wrong. This is the
    version a direct repository call cannot route around, in the same way the
    publish trigger backs invariant 8. Four rules:

      1. **An application is filed once.** It starts at SUBMITTED with no
         interview and no hire, and its job, tenant and candidate never change.
      2. **A stage change is one the pipeline allows** -- the pairs come from
         `applications.domain.allowed_transitions()`, the same function the
         service's rules are tested against, so the two cannot drift.
      3. **Hire confirmations are latches.** Once set, nobody moves or clears
         them; a dispute likewise. With the CHECKs on the table, that makes
         HIRED unreachable without both parties.
      4. **Each party writes only its own side.** A candidate transaction
         (`app.user_id` bound, no tenant) may withdraw or confirm, and cannot
         touch the stage otherwise, the interview or the employer's
         confirmation. A tenant transaction cannot withdraw on the candidate's
         behalf, confirm for them, or dispute.

    A transaction binding neither -- the migrator seeding tests, a data
    migration -- is held to rules 1 to 3 only.

    Not SECURITY DEFINER: it reads nothing but the row and the two settings.
    """
    from app.modules.applications.domain import allowed_transitions

    pairs = ", ".join(f"('{a}', '{b}')" for a, b in sorted(allowed_transitions()))
    op.execute(
        f"""
        CREATE OR REPLACE FUNCTION guard_application_write()
        RETURNS TRIGGER
        SET search_path = public, pg_temp
        AS $$
        DECLARE
          tenant_bound boolean := NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL;
          candidate_bound boolean := NOT tenant_bound
            AND NULLIF(current_setting('app.user_id', true), '') IS NOT NULL;
        BEGIN
          IF TG_OP = 'INSERT' THEN
            IF NEW.stage <> 'SUBMITTED'
               OR NEW.employer_confirmed_at IS NOT NULL
               OR NEW.candidate_confirmed_at IS NOT NULL
               OR NEW.hire_disputed_at IS NOT NULL
               OR NEW.meeting_url IS NOT NULL THEN
              RAISE EXCEPTION 'APPLICATION_GUARD: an application starts at SUBMITTED'
                USING ERRCODE = 'check_violation';
            END IF;
            RETURN NEW;
          END IF;

          IF NEW.tenant_id <> OLD.tenant_id OR NEW.job_id <> OLD.job_id
             OR NEW.candidate_id <> OLD.candidate_id OR NEW.created_at <> OLD.created_at THEN
            RAISE EXCEPTION 'APPLICATION_GUARD: an application is never refiled'
              USING ERRCODE = 'check_violation';
          END IF;

          IF NEW.stage <> OLD.stage AND (OLD.stage, NEW.stage) NOT IN ({pairs}) THEN
            RAISE EXCEPTION 'APPLICATION_GUARD: % -> % is not a pipeline transition',
              OLD.stage, NEW.stage USING ERRCODE = 'check_violation';
          END IF;

          IF (OLD.employer_confirmed_at IS NOT NULL
                AND NEW.employer_confirmed_at IS DISTINCT FROM OLD.employer_confirmed_at)
             OR (OLD.candidate_confirmed_at IS NOT NULL
                AND NEW.candidate_confirmed_at IS DISTINCT FROM OLD.candidate_confirmed_at)
             OR (OLD.hire_disputed_at IS NOT NULL
                AND NEW.hire_disputed_at IS DISTINCT FROM OLD.hire_disputed_at) THEN
            RAISE EXCEPTION 'APPLICATION_GUARD: hire confirmations are latches'
              USING ERRCODE = 'check_violation';
          END IF;

          IF candidate_bound AND (
               (NEW.stage <> OLD.stage AND NEW.stage NOT IN ('WITHDRAWN', 'HIRED'))
               OR NEW.employer_confirmed_at IS DISTINCT FROM OLD.employer_confirmed_at
               OR NEW.meeting_url IS DISTINCT FROM OLD.meeting_url
               OR NEW.interview_at IS DISTINCT FROM OLD.interview_at
               OR NEW.employer_active_at IS DISTINCT FROM OLD.employer_active_at) THEN
            RAISE EXCEPTION 'APPLICATION_GUARD: not the candidate''s to change'
              USING ERRCODE = 'check_violation';
          END IF;

          IF tenant_bound AND (
               (NEW.stage <> OLD.stage AND NEW.stage IN ('WITHDRAWN', 'HIRED'))
               OR NEW.candidate_confirmed_at IS DISTINCT FROM OLD.candidate_confirmed_at
               OR NEW.hire_disputed_at IS DISTINCT FROM OLD.hire_disputed_at) THEN
            RAISE EXCEPTION 'APPLICATION_GUARD: not the employer''s to change'
              USING ERRCODE = 'check_violation';
          END IF;

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_guard_application_write
          BEFORE INSERT OR UPDATE ON applications
          FOR EACH ROW EXECUTE FUNCTION guard_application_write();
        """
    )


# ---------------------------------------------------------------------------
# Day 13 -- the masked-search document, written by the database
# ---------------------------------------------------------------------------
_SEARCH_PROJECTION_SQL = r"""
CREATE OR REPLACE FUNCTION project_candidate_search_document()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_features jsonb := COALESCE(NEW.extracted_features, '{}'::jsonb);
  v_skills text[];
  v_months bigint;
  v_badges text[];
BEGIN
  -- Distinct canonical skills, first spelling wins, contact-like text dropped.
  SELECT COALESCE(array_agg(d.skill ORDER BY d.ord), '{}'::text[])
    INTO v_skills
    FROM (
      SELECT DISTINCT ON (lower(btrim(s.e->>'canonical_name', E' \t\r\n')))
             btrim(s.e->>'canonical_name', E' \t\r\n') AS skill, s.ord
        FROM jsonb_array_elements(
               CASE WHEN jsonb_typeof(v_features->'skills') = 'array'
                    THEN v_features->'skills' ELSE '[]'::jsonb END
             ) WITH ORDINALITY AS s(e, ord)
       WHERE jsonb_typeof(s.e->'canonical_name') = 'string'
         AND btrim(s.e->>'canonical_name', E' \t\r\n') <> ''
         AND char_length(btrim(s.e->>'canonical_name', E' \t\r\n')) <= __MAX_SKILL_LENGTH__
         AND btrim(s.e->>'canonical_name', E' \t\r\n') !~ '__CONTACT_LIKE__'
       ORDER BY lower(btrim(s.e->>'canonical_name', E' \t\r\n')), s.ord
    ) AS d;

  -- Months summed from the roles as `features_from_extraction` sums them:
  -- positive JSON integers only. CASE, not AND, so the cast is never
  -- attempted on "77", 12.5 or true.
  SELECT COALESCE(sum(
           CASE WHEN jsonb_typeof(r->'months') = 'number'
                     AND (r->>'months') ~ '^[0-9]{1,9}$'
                THEN (r->>'months')::bigint ELSE 0 END
         ), 0)
    INTO v_months
    FROM jsonb_array_elements(
           CASE WHEN jsonb_typeof(v_features->'roles') = 'array'
                THEN v_features->'roles' ELSE '[]'::jsonb END
         ) AS r;

  SELECT COALESCE(array_agg(DISTINCT k.badge ORDER BY k.badge), '{}'::text[])
    INTO v_badges
    FROM (
      SELECT __BADGE_CASE__ AS badge
        FROM jsonb_array_elements(
               CASE WHEN jsonb_typeof(NEW.contributing_events) = 'array'
                    THEN NEW.contributing_events ELSE '[]'::jsonb END
             ) AS e
    ) AS k
   WHERE k.badge IS NOT NULL;

  INSERT INTO candidate_search_documents AS doc (
           user_id, score_id, resume_version_id, computed_at, band, band_rank,
           experience_months, skills, skill_keys, badges, search_vector)
  VALUES (
           NEW.user_id, NEW.id, NEW.resume_version_id, NEW.computed_at,
           __BAND_CASE__, __RANK_CASE__,
           LEAST(v_months, 2147483647)::integer,
           v_skills,
           ARRAY(SELECT lower(x) FROM unnest(v_skills) AS x),
           v_badges,
           to_tsvector('simple', array_to_string(v_skills, ' ')))
  ON CONFLICT (user_id) DO UPDATE
     SET score_id = EXCLUDED.score_id,
         resume_version_id = EXCLUDED.resume_version_id,
         computed_at = EXCLUDED.computed_at,
         band = EXCLUDED.band,
         band_rank = EXCLUDED.band_rank,
         experience_months = EXCLUDED.experience_months,
         skills = EXCLUDED.skills,
         skill_keys = EXCLUDED.skill_keys,
         badges = EXCLUDED.badges,
         search_vector = EXCLUDED.search_vector
   -- The discovery CTE's "latest": greatest (computed_at, id). An older score
   -- arriving late never overwrites a newer document.
   WHERE (doc.computed_at, doc.score_id) <= (EXCLUDED.computed_at, EXCLUDED.score_id);

  RETURN NULL;
END;
$$;
"""


def _create_candidate_search_projection() -> None:
    """Keep `candidate_search_documents` equal to each candidate's latest score.

    **A trigger, not a task.** Masked search filters on facts taken from the
    stored extraction, and an event-driven copy can miss an event, fall behind
    a re-score, or be written by code that has a bug in it. An `AFTER INSERT`
    trigger on `scores` runs in the transaction that wrote the score, reads
    nothing but that row, and is the only writer the table has -- the app role
    holds no INSERT, UPDATE or DELETE on it (`_apply_append_only_grants`).

    **Generated from the rules it mirrors**, as the application guard is built
    from `allowed_transitions()`:

      * bands from `scoring.domain.BANDS`, out-of-range values going to the
        nearest end exactly as `band_for` does;
      * badges from `discovery.domain.BADGE_FOR_ADDON_KIND`;
      * the contact filter from `discovery.domain.CONTACT_LIKE_PATTERN`, a
        regex written in the dialect Python and Postgres share.

    Experience is summed in SQL rather than generated, and
    `test_masked_search.py` holds it equal to `features_from_extraction` on
    malformed extractions as well as ordinary ones.

    SECURITY DEFINER so the trigger can write a table the role that inserted
    the score cannot. It reads only `NEW`.
    """
    from app.modules.discovery.domain import (
        BADGE_FOR_ADDON_KIND,
        CONTACT_LIKE_PATTERN,
        MAX_SKILL_LENGTH,
    )
    from app.modules.scoring.domain import BANDS

    upper_bounds = [(label, high) for label, _low, high in BANDS[:-1]]
    band_case = (
        "CASE "
        + " ".join(f"WHEN NEW.raw_value <= {high} THEN '{label}'" for label, high in upper_bounds)
        + f" ELSE '{BANDS[-1][0]}' END"
    )
    rank_case = (
        "CASE "
        + " ".join(f"WHEN NEW.raw_value <= {high} THEN {i}" for i, (_, high) in enumerate(upper_bounds))
        + f" ELSE {len(BANDS) - 1} END"
    )
    badge_case = (
        "CASE e->>'kind' "
        + " ".join(f"WHEN '{kind}' THEN '{badge}'" for kind, badge in sorted(BADGE_FOR_ADDON_KIND.items()))
        + " END"
    )

    op.execute(
        _SEARCH_PROJECTION_SQL.replace("__BAND_CASE__", band_case)
        .replace("__RANK_CASE__", rank_case)
        .replace("__BADGE_CASE__", badge_case)
        .replace("__CONTACT_LIKE__", CONTACT_LIKE_PATTERN.replace("'", "''"))
        .replace("__MAX_SKILL_LENGTH__", str(MAX_SKILL_LENGTH))
    )
    op.execute(
        """
        CREATE TRIGGER trg_project_candidate_search_document
          AFTER INSERT ON scores
          FOR EACH ROW EXECUTE FUNCTION project_candidate_search_document();
        """
    )
