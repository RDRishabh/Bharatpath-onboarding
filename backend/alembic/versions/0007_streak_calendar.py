"""The streak calendar: which days a candidate opened the app, kept a year.

* `streak_activity_days` -- one row per day counted, the date and nothing
  else (client, 2026-09-29: opened or not, no count of opens).
* `user_streaks.first_active_on` -- the first day ever counted, so the
  calendar can tell a day before a candidate started from a day they missed.
* **Backfill** of both from what the ledger already knows. A streak run is
  consecutive days, and every break penalty and milestone row names its run's
  first day and length, so past runs are rebuilt rather than guessed. A run
  that left no ledger row (a break while the penalty was configured to 0) is
  not recoverable and is not invented.
* `purge_streak_activity_days` -- deletes days older than the retention
  window. SECURITY DEFINER because the app role holds no DELETE on the table,
  and it picks the cut-off itself, so no caller can delete a retained day.
* `erase_candidate` -- replaced whole, to erase the new table.

The baseline builds the table and column from the current models too, so on
a database built from it they already exist: both are created only when
missing, as `0005_portal_dashboards` does. Grants, backfill and functions are
written either way.

Revision ID: 0007_streak_calendar
Revises: 0006_interviews_are_bought
Create Date: 2026-09-29
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007_streak_calendar"
down_revision: str | None = "0006_interviews_are_bought"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

APP_ROLE = "bharatpath_app"

#: `engagement.domain.ACTIVITY_RETENTION_DAYS`, frozen here as SQL. A test
#: holds the two equal; a new period is a new migration.
RETENTION_DAYS = 365

#: The candidate's day, as `engagement.service.local_day` decides it.
_IST_TODAY = "(now() AT TIME ZONE 'Asia/Kolkata')::date"


def upgrade() -> None:
    bind = op.get_bind()
    if not sa.inspect(bind).has_table("streak_activity_days"):
        op.create_table(
            "streak_activity_days",
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                primary_key=True,
            ),
            sa.Column("activity_on", sa.Date(), primary_key=True),
        )
    op.create_index(
        "ix_streak_activity_days_activity_on",
        "streak_activity_days",
        ["activity_on"],
        if_not_exists=True,
    )
    op.execute("ALTER TABLE user_streaks ADD COLUMN IF NOT EXISTS first_active_on date")

    # Written once a day, never rewritten; deleted only by the purge below.
    op.execute(f"REVOKE UPDATE, DELETE ON streak_activity_days FROM {APP_ROLE}")

    _backfill()

    op.execute(
        f"""
        CREATE OR REPLACE FUNCTION purge_streak_activity_days(p_today date)
        RETURNS integer
        LANGUAGE plpgsql SECURITY DEFINER
        SET search_path = public, pg_temp
        AS $fn$
        DECLARE
          n integer;
        BEGIN
          -- Never later than the database's own IST day, so a caller with a
          -- wrong clock (or a NULL) can only ever delete less.
          DELETE FROM streak_activity_days
           WHERE activity_on < LEAST(p_today, {_IST_TODAY}) - {RETENTION_DAYS};
          GET DIAGNOSTICS n = ROW_COUNT;
          RETURN n;
        END;
        $fn$;
        """
    )
    op.execute("REVOKE ALL ON FUNCTION purge_streak_activity_days(date) FROM PUBLIC")
    op.execute(f"GRANT EXECUTE ON FUNCTION purge_streak_activity_days(date) TO {APP_ROLE}")

    op.execute(ERASE_WITH_ACTIVITY_DAYS)


def downgrade() -> None:
    op.execute(ERASE_WITH_ACTIVITY_DAYS.replace(_ACTIVITY_DAYS_DELETE, ""))
    op.execute("DROP FUNCTION IF EXISTS purge_streak_activity_days(date)")
    op.execute("ALTER TABLE user_streaks DROP COLUMN IF EXISTS first_active_on")
    op.drop_table("streak_activity_days")


def _backfill() -> None:
    # Every run the ledger names: a break penalty records the run it broke, a
    # milestone the run it was reached in, and `user_streaks` the current one.
    runs = """
        SELECT user_id, streak_started_on AS first_day,
               streak_started_on + (streak_length - 1) AS last_day
          FROM streak_point_events
         WHERE streak_started_on IS NOT NULL AND streak_length > 0
        UNION ALL
        SELECT user_id, streak_started_on, last_active_on
          FROM user_streaks
         WHERE streak_started_on IS NOT NULL AND last_active_on IS NOT NULL
    """
    op.execute(
        f"""
        INSERT INTO streak_activity_days (user_id, activity_on)
        SELECT r.user_id, d::date
          FROM ({runs}) r
          CROSS JOIN LATERAL generate_series(
                 GREATEST(r.first_day, {_IST_TODAY} - {RETENTION_DAYS}),
                 r.last_day, interval '1 day') AS d
        ON CONFLICT DO NOTHING
        """
    )
    op.execute(
        f"""
        UPDATE user_streaks us
           SET first_active_on = firsts.first_day
          FROM (SELECT user_id, min(first_day) AS first_day FROM ({runs}) r GROUP BY user_id) firsts
         WHERE firsts.user_id = us.user_id AND us.first_active_on IS NULL
        """
    )


# ---------------------------------------------------------------------------
# The erasure cascade, replaced whole: 0005's, plus `streak_activity_days`.
# `test_erasure_plan.py` reads the live definition.
# ---------------------------------------------------------------------------
_ACTIVITY_DAYS_DELETE = """          DELETE FROM streak_activity_days WHERE user_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT;
          m := m || jsonb_build_object('streak_activity_days', n);
"""

ERASE_WITH_ACTIVITY_DAYS = (
    """
        CREATE OR REPLACE FUNCTION erase_candidate(p_user_id uuid, p_policy_version text)
        RETURNS jsonb
        LANGUAGE plpgsql SECURITY DEFINER
        SET search_path = public, pg_temp
        AS $fn$
        DECLARE
          m jsonb := '{}'::jsonb;
          n integer;
        BEGIN
          IF p_policy_version IS NULL OR p_policy_version = '' THEN
            RAISE EXCEPTION 'ERASURE: refusing to erase under no stated policy'
              USING ERRCODE = 'check_violation';
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM users WHERE id = p_user_id AND pool = 'CANDIDATE'
          ) THEN
            -- A business account is entangled with an organisation that
            -- outlives it: erasing the last owner of an employer strands the
            -- tenant, its jobs and its staff. Those go through support until
            -- somebody decides what happens to the organisation (blockers B3).
            RAISE EXCEPTION 'ERASURE: only a candidate account is erased this way'
              USING ERRCODE = 'check_violation';
          END IF;

          -- The employer-facing projection first: it is written by a trigger
          -- on `scores`, so deleting the scores alone would leave the card.
          DELETE FROM candidate_search_documents WHERE user_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT;
          m := m || jsonb_build_object('candidate_search_documents', n);

          DELETE FROM integrity_signals WHERE candidate_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('integrity_signals', n);
          DELETE FROM integrity_checks WHERE candidate_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('integrity_checks', n);

          -- Shared and content-addressed, so a key goes only when this person
          -- is the last one whose score names it.
          DELETE FROM resume_extractions re
           WHERE re.cache_key IN (
                   SELECT s.extraction_cache_key FROM scores s
                    WHERE s.user_id = p_user_id AND s.extraction_cache_key IS NOT NULL)
             AND NOT EXISTS (
                   SELECT 1 FROM scores s2
                    WHERE s2.extraction_cache_key = re.cache_key
                      AND s2.user_id <> p_user_id);
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('resume_extractions', n);

          DELETE FROM scores WHERE user_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('scores', n);

          DELETE FROM resume_versions WHERE user_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('resume_versions', n);
          DELETE FROM resume_files WHERE user_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('resume_files', n);

          -- A dispute about one of these applications goes with it, whoever
          -- raised it: it exists to be read beside the application.
          DELETE FROM disputes
           WHERE raised_by = p_user_id
              OR application_id IN (SELECT id FROM applications WHERE candidate_id = p_user_id);
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('disputes', n);
          DELETE FROM application_messages
           WHERE application_id IN (SELECT id FROM applications WHERE candidate_id = p_user_id);
          GET DIAGNOSTICS n = ROW_COUNT;
          m := m || jsonb_build_object('application_messages', n);
          DELETE FROM application_events
           WHERE application_id IN (SELECT id FROM applications WHERE candidate_id = p_user_id);
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('application_events', n);
          DELETE FROM applications WHERE candidate_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('applications', n);

          DELETE FROM interview_evaluations
           WHERE session_id IN (SELECT id FROM interview_sessions WHERE user_id = p_user_id);
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('interview_evaluations', n);
          DELETE FROM interview_transcripts
           WHERE session_id IN (SELECT id FROM interview_sessions WHERE user_id = p_user_id);
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('interview_transcripts', n);
          DELETE FROM interview_session_questions
           WHERE session_id IN (SELECT id FROM interview_sessions WHERE user_id = p_user_id);
          GET DIAGNOSTICS n = ROW_COUNT;
          m := m || jsonb_build_object('interview_session_questions', n);
          DELETE FROM interview_answers
           WHERE session_id IN (SELECT id FROM interview_sessions WHERE user_id = p_user_id);
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('interview_answers', n);
          DELETE FROM interview_sessions WHERE user_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('interview_sessions', n);
          DELETE FROM interview_checkout_notices WHERE user_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT;
          m := m || jsonb_build_object('interview_checkout_notices', n);
          DELETE FROM device_checks WHERE user_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('device_checks', n);

          DELETE FROM course_lesson_progress WHERE user_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT;
          m := m || jsonb_build_object('course_lesson_progress', n);
          DELETE FROM course_completions WHERE user_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('course_completions', n);
          DELETE FROM entitlements WHERE user_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('entitlements', n);

          DELETE FROM questionnaire_responses WHERE user_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT;
          m := m || jsonb_build_object('questionnaire_responses', n);
"""
    + _ACTIVITY_DAYS_DELETE
    + """          DELETE FROM streak_point_events WHERE user_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('streak_point_events', n);
          DELETE FROM user_streaks WHERE user_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('user_streaks', n);

          -- Released through the guard, then removed: `seats_used` only ever
          -- moves through that guard, and a deleted row would leave a college
          -- one seat short forever.
          UPDATE college_seat_assignments
             SET released_at = now(), release_reason = 'ERASURE'
           WHERE candidate_id = p_user_id AND released_at IS NULL;
          DELETE FROM college_seat_assignments WHERE candidate_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT;
          m := m || jsonb_build_object('college_seat_assignments', n);
          DELETE FROM student_consents WHERE candidate_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('student_consents', n);

          DELETE FROM profile_nudges WHERE user_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('profile_nudges', n);
          DELETE FROM notification_suppressions WHERE user_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT;
          m := m || jsonb_build_object('notification_suppressions', n);
          DELETE FROM notification_preferences WHERE user_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT;
          m := m || jsonb_build_object('notification_preferences', n);
          DELETE FROM notifications WHERE user_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('notifications', n);

          DELETE FROM candidate_profiles WHERE user_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('candidate_profiles', n);
          DELETE FROM memberships WHERE user_id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('memberships', n);

          -- The anchor. Emptied, never dropped: `payments`, `audit_events`
          -- and `candidate_view_events` still point here, and they are the
          -- carve-out the client confirmed (answers-log 7.4, Round 10.2).
          --
          -- The subject is replaced by its SHA-256, not nulled. A token
          -- issued before the erasure stays cryptographically valid until it
          -- expires, and with a NULL here sign-in would find no row for it
          -- and create a fresh account from the erased person's credential.
          -- The hash cannot be turned back into the subject; sign-in hashes
          -- the presented one and refuses a match as `account_inactive`.
          UPDATE users
             SET phone = NULL, email = NULL,
                 cognito_sub = encode(sha256(convert_to(cognito_sub, 'UTF8')), 'hex'),
                 status = 'DELETED', locale = 'en', updated_at = now()
           WHERE id = p_user_id;
          GET DIAGNOSTICS n = ROW_COUNT; m := m || jsonb_build_object('users', n);

          RETURN m;
        END;
        $fn$;
"""
)
