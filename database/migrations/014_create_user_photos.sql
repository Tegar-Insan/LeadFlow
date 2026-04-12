-- Migration 014: user_photos table
-- Stores profile photo history per user; only one row with is_active = TRUE at a time.
-- Run AFTER 013 migrations.

CREATE TABLE IF NOT EXISTS user_photos (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url    TEXT        NOT NULL,
  storage_path TEXT        NOT NULL,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce one active photo per user at the DB level
CREATE UNIQUE INDEX IF NOT EXISTS user_photos_one_active_per_user
  ON user_photos(user_id)
  WHERE is_active = TRUE;

-- Indexes
CREATE INDEX IF NOT EXISTS user_photos_user_id_idx ON user_photos(user_id);

-- RLS
ALTER TABLE user_photos ENABLE ROW LEVEL SECURITY;

-- Users can read/manage only their own photo rows
CREATE POLICY "user_photos_self_all"
  ON user_photos FOR ALL
  USING (user_id = get_caller_user_id())
  WITH CHECK (user_id = get_caller_user_id());

-- Admins have full access
CREATE POLICY "user_photos_admin_all"
  ON user_photos FOR ALL
  USING (get_caller_role() = 'admin');

-- Explicit grants — required for PostgREST to operate even with service_role key
GRANT ALL ON TABLE user_photos TO postgres;
GRANT ALL ON TABLE user_photos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_photos TO authenticated;
GRANT SELECT ON TABLE user_photos TO anon;
