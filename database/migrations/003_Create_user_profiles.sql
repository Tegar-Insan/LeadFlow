-- =============================================================================
-- LEADFLOW — 003_Create_user_profiles.sql
-- Increment : 1 — Authentication & User Management
-- Contains  : user_profiles table + auto-create trigger + view + RLS
-- SRS Ref   : UC003 Manage Account
-- SDS Ref   : Section 5.4 — UserProfile class
--             Section 5.5 — Entity: UserProfile — Data Dict <UserProfile>
--             Section 5.8 — SD003 Sequence: Manage Account
-- Depends   : 001_Create_roles.sql, 002_Create_users.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: user_profiles
-- Separated from users table for clean auth/profile boundary.
-- Auto-created when a user is inserted (trigger below).
-- SDS Entity: UserProfile
-- Attributes: profileId, userId, fullName, phone, email
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name       VARCHAR(150) NOT NULL,
    phone           VARCHAR(20),
    avatar_url      TEXT,
    preferred_lang  VARCHAR(10) NOT NULL DEFAULT 'id',  -- 'id' = Bahasa Indonesia default
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  user_profiles          IS 'Personal profile data. Separated from auth credentials. Auto-created on user insert.';
COMMENT ON COLUMN user_profiles.user_id  IS 'One-to-one with users. CASCADE delete — profile removed with user.';

CREATE INDEX idx_user_profiles_user_id ON user_profiles (user_id);

-- Auto-update updated_at
CREATE TRIGGER trg_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- TRIGGER: auto-create user_profile when new user is inserted
-- Ensures profile row ALWAYS exists — avoids null checks in backend
-- Default full_name taken from email prefix until staff updates it
-- SDS UC003 NF: Admin can update profile fields
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_create_user_profile()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO user_profiles (user_id, full_name)
    VALUES (NEW.id, split_part(NEW.email, '@', 1));
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_user_profile
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_create_user_profile();

-- ---------------------------------------------------------------------------
-- VIEW: v_users_with_roles
-- Admin user management panel — joins user + role + profile
-- All timestamps converted to WIB (GMT+7) per display layer rule
-- Used by: UC003 Manage Account — Admin page
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_users_with_roles AS
SELECT
    u.id                                AS user_id,
    u.email,
    r.name                              AS role,
    p.full_name,
    p.phone,
    p.avatar_url,
    u.is_active,
    u.email_verified,
    to_wib(u.created_at)                AS created_at_wib,
    to_wib(u.last_login_at)             AS last_login_wib,
    to_wib(u.updated_at)                AS updated_at_wib
FROM users u
JOIN  roles         r ON r.id     = u.role_id
LEFT JOIN user_profiles p ON p.user_id = u.id;

COMMENT ON VIEW v_users_with_roles IS 'Admin panel view. Full user list with roles and profiles. Times in WIB.';

-- ---------------------------------------------------------------------------
-- RLS: user_profiles
-- Admin has full access; users can only read/update their own profile
-- ---------------------------------------------------------------------------
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_profiles_admin_all ON user_profiles
    FOR ALL USING (get_caller_role() = 'admin');

CREATE POLICY rls_profiles_self_all ON user_profiles
    FOR ALL USING (user_id = get_caller_user_id());