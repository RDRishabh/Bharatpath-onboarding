-- Two roles, and the difference between them is the whole point.
--
-- `bharatpath_app` is what the API and workers connect as. It is NOT the table
-- owner and does NOT have BYPASSRLS, so Row-Level Security actually applies to
-- it. Connecting as the owner is the single most common way an RLS design ends
-- up doing nothing at all.
--
-- `bharatpath_admin` may cross tenants for admin drill-downs. It is a separate
-- connection on a separate engine, and every session opened on it emits an
-- audit event. There is deliberately no "admin flag" on the normal session.

CREATE ROLE bharatpath_app  LOGIN PASSWORD 'bharatpath_app'  NOBYPASSRLS;
CREATE ROLE bharatpath_admin LOGIN PASSWORD 'bharatpath_admin' BYPASSRLS;

GRANT CONNECT ON DATABASE bharatpath TO bharatpath_app, bharatpath_admin;
GRANT USAGE  ON SCHEMA public        TO bharatpath_app, bharatpath_admin;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bharatpath_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO bharatpath_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO bharatpath_admin;

-- The audit trail is append-only from the application path. The Alembic
-- baseline re-applies this after creating the table; it is repeated here so a
-- freshly initialised dev database has it from the first second.
-- REVOKE UPDATE, DELETE ON audit_events FROM bharatpath_app;  -- see migration
