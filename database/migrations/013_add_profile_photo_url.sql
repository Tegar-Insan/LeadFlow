-- 013_add_profile_photo_url.sql
-- Adds profile photo URL column to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT DEFAULT NULL;
