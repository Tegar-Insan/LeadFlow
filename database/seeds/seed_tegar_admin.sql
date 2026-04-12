-- =============================================================================
-- LEADFLOW — seeds/seed_tegar_admin.sql
-- Purpose   : Assign tegarinsan49@gmail.com as the sole LeadFlow admin
-- Run in    : Supabase Dashboard → SQL Editor
-- Depends   : seeds_roles.sql (roles must exist with fixed UUIDs)
-- =============================================================================
-- Admin role UUID (from seeds_roles.sql):
--   '00000000-0000-0000-0000-000000000001'  →  'admin'
-- =============================================================================

DO $$
DECLARE
  v_admin_role_id UUID  := '00000000-0000-0000-0000-000000000001';
  v_email         TEXT  := 'tegarinsan49@gmail.com';
  v_user_id       UUID;
BEGIN

  -- ── CASE 1: User already registered via OTP ────────────────────────────
  SELECT id INTO v_user_id FROM users WHERE email = v_email;

  IF v_user_id IS NOT NULL THEN
    -- Promote to admin
    UPDATE users
    SET role_id = v_admin_role_id
    WHERE id = v_user_id;

    RAISE NOTICE 'Admin role assigned to existing user: % (id=%)', v_email, v_user_id;

  -- ── CASE 2: Not yet registered — create the account directly ──────────
  ELSE
    INSERT INTO users (role_id, email, password_hash, is_active, email_verified)
    VALUES (
      v_admin_role_id,
      v_email,
      crypt('LeadFlow@Tegar2024', gen_salt('bf', 12)),
      TRUE,
      TRUE
    )
    RETURNING id INTO v_user_id;

    -- Create the user_profiles row (trigger may do this, but be explicit)
    INSERT INTO user_profiles (user_id, full_name, phone)
    VALUES (v_user_id, 'Tegar Insan Tohaga', NULL)
    ON CONFLICT (user_id) DO UPDATE
      SET full_name = 'Tegar Insan Tohaga';

    RAISE NOTICE 'Admin user created: % (id=%)', v_email, v_user_id;
    RAISE NOTICE 'Temporary password: LeadFlow@Tegar2024 — CHANGE THIS IN PROFILE SETTINGS';
  END IF;

END $$;

-- Verify
SELECT
  u.id,
  u.email,
  r.name       AS role,
  u.is_active,
  u.email_verified,
  p.full_name,
  p.phone
FROM users         u
JOIN roles         r ON r.id = u.role_id
LEFT JOIN user_profiles p ON p.user_id = u.id
WHERE u.email = 'tegarinsan49@gmail.com';
