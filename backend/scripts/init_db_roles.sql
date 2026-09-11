-- Three roles, and the differences between them are load-bearing.
--
-- THE TRAP THIS AVOIDS: Row-Level Security does not apply to a table's OWNER,
-- and does not apply to a role with BYPASSRLS. If migrations run as the same
-- role the application connects as, that role owns every table and RLS
-- silently does nothing -- while every policy still shows up in \d+ and looks
-- correct. That is the second line of tenant isolation quietly dead.
--
-- So: `bharatpath_migrator` owns the schema and runs Alembic.
--     `bharatpath_app` gets DML only and owns nothing.
--     `bharatpath_admin` may cross tenants, on a separate engine, audited.

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
--
-- Every statement below is idempotent. Re-running this file must be safe:
-- `scripts/reset_local_db.sh` reapplies it against a container whose roles
-- already exist, and a bare CREATE ROLE would abort the whole reset on the
-- first line.

-- Owns every table. Runs migrations. The application NEVER connects as this.
--
-- BYPASSRLS is required, and the reason is subtle. Tenant-scoped tables carry
-- FORCE ROW LEVEL SECURITY, which makes the policy apply to the table OWNER
-- too -- that is the whole point of FORCE. So without BYPASSRLS this role,
-- despite owning every table, could not write a single row to a tenant-scoped
-- one, because `app.tenant_id` is unset during a migration and a data
-- migration backfilling several tenants could not set it to one value anyway.
--
-- This does NOT weaken the application's isolation. What protects the app is
-- that `bharatpath_app` is neither an owner nor holds BYPASSRLS. FORCE stays
-- because it is what saves us if someone ever makes the app role an owner by
-- accident -- which is exactly the mistake this three-role split exists to
-- prevent.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bharatpath_migrator') THEN
    CREATE ROLE bharatpath_migrator LOGIN PASSWORD 'bharatpath_migrator' BYPASSRLS;
  END IF;
END $$;

-- What the API and the workers connect as. Not an owner, no BYPASSRLS, so RLS
-- genuinely applies to it.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bharatpath_app') THEN
    CREATE ROLE bharatpath_app LOGIN PASSWORD 'bharatpath_app' NOBYPASSRLS;
  END IF;
END $$;

-- Admin drill-downs that legitimately cross tenants. A separate engine and a
-- separate session factory -- deliberately not a boolean on the normal
-- session, so you cannot get cross-tenant reach by passing the wrong flag.
-- Every session opened on this role is expected to emit an audit event.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bharatpath_admin') THEN
    CREATE ROLE bharatpath_admin LOGIN PASSWORD 'bharatpath_admin' BYPASSRLS;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Schema ownership and grants
-- ---------------------------------------------------------------------------

ALTER SCHEMA public OWNER TO bharatpath_migrator;

GRANT CONNECT ON DATABASE bharatpath
  TO bharatpath_migrator, bharatpath_app, bharatpath_admin;

GRANT USAGE ON SCHEMA public
  TO bharatpath_app, bharatpath_admin;

-- Anything the migrator creates from here on is automatically usable by the
-- app role. Without these ALTER DEFAULT PRIVILEGES lines, every migration
-- would have to remember to GRANT, and one that forgot would break at runtime
-- rather than at migration time.
ALTER DEFAULT PRIVILEGES FOR ROLE bharatpath_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bharatpath_app;
ALTER DEFAULT PRIVILEGES FOR ROLE bharatpath_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO bharatpath_app;

-- The admin bypass role is READ-ONLY, deliberately. It exists so admin
-- drill-downs can see across tenants (SRS 1.17.4-1.17.6), and every session
-- opened on it is expected to emit an audit event. A role that can both cross
-- every tenant boundary AND write is the most dangerous credential in the
-- system, so it gets one of those two powers, not both.
--
-- Admin actions that genuinely write -- KYB decisions, integrity resolutions,
-- tenant suspensions, seat allocation -- go through the ordinary app role with
-- an explicit tenant context, so they stay inside RLS and inside the audit
-- path. Revisit on Day 19 if a cross-tenant write turns out to be unavoidable.
ALTER DEFAULT PRIVILEGES FOR ROLE bharatpath_migrator IN SCHEMA public
  GRANT SELECT ON TABLES TO bharatpath_admin;
ALTER DEFAULT PRIVILEGES FOR ROLE bharatpath_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO bharatpath_admin;

-- The per-table exceptions -- append-only audit, INSERT-only scores -- are
-- applied by the Alembic baseline, right after the tables are created. They
-- live there rather than here so they travel with the schema to every
-- environment, not just a freshly initialised dev container.
