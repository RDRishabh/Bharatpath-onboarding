"""Include mock-interview sessions in the candidate subscription.

Historical one-off payments and purchases remain financial records. New
sessions have no purchase_id; the database guard instead requires a live
candidate subscription and a fresh passed device check.

Revision ID: 0002_interviews_in_subscription
Revises: 0001_baseline
Create Date: 2026-09-22
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

from app.modules.interview.bank import QUESTIONS_PER_SESSION
from app.modules.interview.domain import OPEN_STATES, SESSION_TRANSITIONS

revision: str = "0002_interviews_in_subscription"
down_revision: str | None = "0001_baseline"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pairs = ", ".join(f"('{a}', '{b}')" for a, b in sorted(SESSION_TRANSITIONS))

    op.execute("ALTER TABLE interview_sessions ALTER COLUMN purchase_id DROP NOT NULL")
    op.execute(
        f"""
        CREATE OR REPLACE FUNCTION guard_interview_session_write()
        RETURNS TRIGGER
        SET search_path = public, pg_temp
        AS $$
        BEGIN
          IF TG_OP = 'INSERT' THEN
            IF NEW.state <> 'CREATED' OR NEW.completed_at IS NOT NULL
               OR NEW.points_awarded IS NOT NULL THEN
              RAISE EXCEPTION 'INTERVIEW_SESSION_GUARD: a session starts CREATED'
                USING ERRCODE = 'check_violation';
            END IF;

            IF NEW.purchase_id IS NULL THEN
              IF NOT EXISTS (
                SELECT 1 FROM subscriptions s
                 WHERE s.subscriber_type = 'USER'
                   AND s.subscriber_id = NEW.user_id
                   AND s.state IN ('ACTIVE', 'GRACE')
                   AND s.current_period_start <= now()
                   AND s.current_period_end > now()
              ) THEN
                RAISE EXCEPTION 'INTERVIEW_SESSION_GUARD: a session needs a live subscription'
                  USING ERRCODE = 'check_violation';
              END IF;
            ELSIF NOT EXISTS (
              SELECT 1 FROM interview_purchases p
               WHERE p.id = NEW.purchase_id AND p.user_id = NEW.user_id
            ) THEN
              RAISE EXCEPTION 'INTERVIEW_SESSION_GUARD: a paid session starts from its owner''s purchase'
                USING ERRCODE = 'check_violation';
            END IF;

            IF NOT EXISTS (
              SELECT 1 FROM device_checks d
               WHERE d.id = NEW.device_check_id
                 AND d.user_id = NEW.user_id
                 AND d.passed
                 AND d.checked_at <= now()
                 AND d.checked_at + interval '60 minutes' > now()
            ) THEN
              RAISE EXCEPTION 'INTERVIEW_SESSION_GUARD: a session needs its owner''s fresh passed device check'
                USING ERRCODE = 'check_violation';
            END IF;
            RETURN NEW;
          END IF;

          IF NEW.user_id <> OLD.user_id
             OR NEW.purchase_id IS DISTINCT FROM OLD.purchase_id
             OR NEW.device_check_id <> OLD.device_check_id
             OR NEW.session_number <> OLD.session_number
             OR NEW.question_set_code <> OLD.question_set_code
             OR NEW.question_set_version <> OLD.question_set_version
             OR NEW.created_at <> OLD.created_at THEN
            RAISE EXCEPTION 'INTERVIEW_SESSION_GUARD: what a session is never changes'
              USING ERRCODE = 'check_violation';
          END IF;

          IF OLD.completed_at IS NOT NULL AND (
               NEW.completed_at IS DISTINCT FROM OLD.completed_at
               OR NEW.points_awarded IS DISTINCT FROM OLD.points_awarded
               OR NEW.contribution_version IS DISTINCT FROM OLD.contribution_version) THEN
            RAISE EXCEPTION 'INTERVIEW_SESSION_GUARD: a completion is a latch'
              USING ERRCODE = 'check_violation';
          END IF;

          IF NEW.state <> OLD.state AND (OLD.state, NEW.state) NOT IN ({pairs}) THEN
            RAISE EXCEPTION 'INTERVIEW_SESSION_GUARD: % -> % is not a session transition',
              OLD.state, NEW.state USING ERRCODE = 'check_violation';
          END IF;

          IF NEW.state IN ('EVALUATED', 'FAILED') AND NEW.state <> OLD.state AND NOT EXISTS (
               SELECT 1 FROM interview_evaluations e
                WHERE e.session_id = NEW.id AND e.outcome = NEW.state
             ) THEN
            RAISE EXCEPTION 'INTERVIEW_SESSION_GUARD: % needs the evaluation that records it', NEW.state
              USING ERRCODE = 'check_violation';
          END IF;

          IF NEW.state = 'COMPLETED' AND OLD.state <> 'COMPLETED' AND (
               SELECT count(*) FROM interview_answers a
                WHERE a.session_id = NEW.id AND a.upload_state = 'STORED'
             ) < {QUESTIONS_PER_SESSION} THEN
            RAISE EXCEPTION 'INTERVIEW_SESSION_GUARD: a session completes only with every answer stored'
              USING ERRCODE = 'check_violation';
          END IF;

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )


def downgrade() -> None:
    raise NotImplementedError("The baseline is rebuilt rather than downgraded.")
