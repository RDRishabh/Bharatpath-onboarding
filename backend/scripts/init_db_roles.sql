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

-- Owns every table. Runs migrations. The application NEVER connects as this.
CREATE ROLE bharatpath_migrator LOGIN PASSWORD 'bharatpath_migrator' NOBYPASSRLS;

-- What the API and the workers connect as. Not an owner, no BYPASSRLS, so RLS
-- genuinely applies to it.
CREATE ROLE bharatpath_app LOGIN PASSWORD 'bharatpath_app' NOBYPASSRLS;

-- Admin drill-downs that legitimately cross tenants. A separate engine and a
-- separate session factory -- deliberately not a boolean on the normal
-- session, so you cannot get cross-tenant reach by passing the wrong flag.
-- Every session opened on this role is expected to emit an audit event.
CREATE ROLE bharatpath_admin LOGIN PASSWORD 'bharatpath_admin' BYPASSRLS;

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

ALTER DEFAULT PRIVILEGES FOR ROLE bharatpath_migrator IN SCHEMA public
  GRANT SELECT ON TABLES TO bharatpath_admin;
ALTER DEFAULT PRIVILEGES FOR ROLE bharatpath_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO bharatpath_admin;

-- The per-table exceptions -- append-only audit, INSERT-only scores -- are
-- applied by the Alembic baseline, right after the tables are created. They
-- live there rather than here so they travel with the schema to every
-- environment, not just a freshly initialised dev container.
