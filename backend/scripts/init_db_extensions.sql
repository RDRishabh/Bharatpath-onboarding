-- Runs before the role script (05 sorts before 10).
--
-- pgcrypto gives gen_random_uuid() for server-side UUID defaults.
-- pg_trgm and the tsvector machinery back candidate and job search: the plan
-- deliberately defers OpenSearch until the pool justifies it, so these two
-- indexes are what keep discovery inside its 600ms p95 budget.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
