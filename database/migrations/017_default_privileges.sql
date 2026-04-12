-- Migration 017: Set ALTER DEFAULT PRIVILEGES for all future tables
-- This ensures every table created in future migrations automatically gets
-- the correct grants for service_role, authenticated, and anon — no more
-- "permission denied" surprises on new tables.
--
-- Run ONCE, early. All CREATE TABLE statements after this point in the same
-- session (and future sessions by the postgres role) inherit these grants.
--
-- Root cause this fixes: migrations 001-013 worked because Supabase's project
-- setup applied DEFAULT PRIVILEGES when the project was created. Migration 014
-- (user_photos) was added later and missed those automatic grants.

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

-- Also grant on sequences (needed for SERIAL/BIGSERIAL columns, safe to run even
-- if only UUID PKs are used)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
