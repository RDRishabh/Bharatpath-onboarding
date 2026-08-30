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
        sa.Column("actor_id", sa.dialects.postgresql.UUID(as_uuid=True), index=True),
        sa.Column("actor_role", sa.String(64), nullable=False),
        sa.Column("action", sa.String(64), nullable=False, index=True),
        sa.Column("target_type", sa.String(64), nullable=False),
        sa.Column("target_id", sa.String(64), index=True),
        sa.Column("tenant_id", sa.dialects.postgresql.UUID(as_uuid=True), index=True),
        sa.Column("request_id", sa.String(64)),
        sa.Column(
            "metadata",
            sa.dialects.postgresql.JSONB,
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
        sa.Column("response_body", sa.dialects.postgresql.JSONB),
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
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("event_type", sa.String(128), nullable=False, index=True),
        sa.Column("aggregate_type", sa.String(64), nullable=False),
        sa.Column("aggregate_id", sa.String(64), nullable=False),
        sa.Column("payload", sa.dialects.postgresql.JSONB, nullable=False),
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
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("key", sa.String(128), nullable=False, index=True),
        sa.Column("value", sa.dialects.postgresql.JSONB, nullable=False),
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
    from app.core.db import Base

    bind = op.get_bind()
    Base.metadata.create_all(
        bind=bind,
        tables=[Base.metadata.tables[name] for name in table_names],
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
        "device_checks",
        "dsr_requests",
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
