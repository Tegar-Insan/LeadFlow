-- =============================================================================
-- LEADFLOW — 002_Create_users.sql
-- Increment : 1 — Authentication & User Management
-- Contains  : users, otp_tokens, refresh_tokens tables + triggers + RLS
-- SRS Ref   : UC001 Register Account, UC002 Authenticate User
-- SDS Ref   : Section 5.4 — User class | Section 5.8 — SD001, SD002
--             Section 5.5 — Entity: User | Data Dict: <User>
-- Depends   : 001_Create_roles.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: users
-- Core authentication table. Password stored as bcrypt hash (pgcrypto).
-- JWT issued ONLY after OTP verified (UC002 Normal Flow).
-- SDS Entity: User — Attributes: userid, roleid, email, passwordHash
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id         UUID        NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT        NOT NULL,       -- bcrypt via pgcrypto crypt()
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    email_verified  BOOLEAN     NOT NULL DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users               IS 'Core auth table. One row per system user. Password NEVER stored plaintext.';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hash via pgcrypto crypt(password, gen_salt(''bf'', 12)). Never store raw.';
COMMENT ON COLUMN users.role_id       IS 'FK to roles — RBAC enforced at DB + middleware layer.';

CREATE INDEX idx_users_email   ON users (email);
CREATE INDEX idx_users_role_id ON users (role_id);

-- Auto-update updated_at
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- TABLE: otp_tokens
-- 6-digit OTP for UC002 (email-based 2FA). Expires in 5 minutes.
-- One active OTP per user — old ones marked expired on new generation.
-- SDS Ref: SD002 Sequence — Authenticate User (OTP step)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS otp_tokens (
    id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT            NOT NULL,       -- hashed OTP — raw value sent via email only
    status      otp_status_enum NOT NULL DEFAULT 'pending',
    expires_at  TIMESTAMPTZ     NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE otp_tokens IS '6-digit email OTP for JWT login. Expires 5 min. Hash stored — raw value emailed to user.';

CREATE INDEX idx_otp_user_id  ON otp_tokens (user_id);
CREATE INDEX idx_otp_expires  ON otp_tokens (expires_at);

-- Auto-expire OTP if window has passed
CREATE OR REPLACE FUNCTION trigger_expire_otp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'pending' AND NEW.expires_at < NOW() THEN
        NEW.status = 'expired';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_otp_expire_check
    BEFORE UPDATE ON otp_tokens
    FOR EACH ROW EXECUTE FUNCTION trigger_expire_otp();

-- ---------------------------------------------------------------------------
-- TABLE: refresh_tokens
-- Long-lived tokens for JWT refresh rotation.
-- Rotated on every use — old token revoked when new one issued.
-- SDS Ref: Section 5.6 — NFR-001 Security
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT        NOT NULL UNIQUE,
    is_revoked      BOOLEAN     NOT NULL DEFAULT FALSE,
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at    TIMESTAMPTZ
);

COMMENT ON TABLE refresh_tokens IS 'JWT refresh tokens. Rotation on use — previous token revoked. 7-day expiry.';

CREATE INDEX idx_refresh_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_hash    ON refresh_tokens (token_hash);
CREATE INDEX idx_refresh_expires ON refresh_tokens (expires_at) WHERE is_revoked = FALSE;

-- ---------------------------------------------------------------------------
-- RLS: users
-- Admin sees all; users see and update only themselves
-- ---------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_users_admin_all ON users
    FOR ALL USING (get_caller_role() = 'admin');

CREATE POLICY rls_users_self_select ON users
    FOR SELECT USING (id = get_caller_user_id());

CREATE POLICY rls_users_self_update ON users
    FOR UPDATE USING (id = get_caller_user_id());

-- ---------------------------------------------------------------------------
-- RLS: otp_tokens
-- Backend service role only — never accessed directly by frontend
-- ---------------------------------------------------------------------------
ALTER TABLE otp_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_otp_admin_only ON otp_tokens
    FOR ALL USING (get_caller_role() = 'admin');

-- ---------------------------------------------------------------------------
-- RLS: refresh_tokens
-- Users can only access their own refresh tokens
-- ---------------------------------------------------------------------------
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_refresh_self ON refresh_tokens
    FOR ALL USING (user_id = get_caller_user_id());