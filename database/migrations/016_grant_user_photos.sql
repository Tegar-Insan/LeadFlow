-- Migration 016: Grant table-level privileges on user_photos
-- The service_role and authenticated roles need explicit GRANT after RLS is enabled.
-- Run AFTER 014_create_user_photos.sql

GRANT ALL ON TABLE user_photos TO postgres;
GRANT ALL ON TABLE user_photos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_photos TO authenticated;
GRANT SELECT ON TABLE user_photos TO anon;
