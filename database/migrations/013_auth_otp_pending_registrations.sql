-- ══════════════════════════════════════════════════════════════════════
-- LeadFlow · Migration 013 — Auth Support Tables (OTP + Pending Reg)
-- File   : database/migrations/013_auth_otp_pending_registrations.sql
--
-- FIX: Removed REFERENCES roles(roleid) from pending_registrations.
--      Reason: pending_registrations is a temporary holding table.
--              A hard FK to roles is unnecessary and breaks if the
--              roles PK column name differs across environments.
--              role_name TEXT achieves the same result safely.
-- ══════════════════════════════════════════════════════════════════════

-- ── DIAGNOSTIC: run this first to confirm your roles table columns ────
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'roles'
-- ORDER BY ordinal_position;
-- ─────────────────────────────────────────────────────────────────────


-- ── 1. otp_verifications ─────────────────────────────────────────────
-- Stores hashed OTP codes for email verification.
-- One active OTP per (email, type) enforced via unique constraint.

CREATE TABLE IF NOT EXISTS otp_verifications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT        NOT NULL,
    otp_hash    TEXT        NOT NULL,
    type        TEXT        NOT NULL
                            CHECK (type IN ('register', 'login', 'reset')),
    expires_at  TIMESTAMPTZ NOT NULL,
    attempts    INTEGER     NOT NULL DEFAULT 0,
    verified    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT otp_email_type_unique UNIQUE (email, type)
);

CREATE INDEX IF NOT EXISTS idx_otp_email_type_verified
    ON otp_verifications (email, type, verified);

COMMENT ON TABLE otp_verifications IS
    'Short-lived OTP records for email verification. One active OTP per (email, type). Service role only.';


-- ── 2. pending_registrations ─────────────────────────────────────────
-- Temporarily holds registration data while OTP is pending.
-- Deleted once user account is successfully created.
--
-- NOTE: role_name TEXT (no FK) — avoids dependency on roles table PK
--       column naming. The backend validates role_name against the roles
--       table before inserting here.

CREATE TABLE IF NOT EXISTS pending_registrations (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    full_name     TEXT        NOT NULL,
    phone         TEXT,
    role_name     TEXT        NOT NULL
                              CHECK (role_name IN ('business_owner', 'marketing_staff')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_reg_email
    ON pending_registrations (email);

COMMENT ON TABLE pending_registrations IS
    'Temporary registration data. Row deleted after OTP verification. Service role only.';


-- ── 3. Row Level Security ────────────────────────────────────────────
-- Both tables are backend-only — default-deny, service role only.

ALTER TABLE otp_verifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;


-- ── 4. Cleanup function ──────────────────────────────────────────────
-- Schedule via Supabase Edge Function or pg_cron every 15 minutes.

CREATE OR REPLACE FUNCTION cleanup_expired_auth_records()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM otp_verifications
    WHERE expires_at < NOW();

    DELETE FROM pending_registrations
    WHERE created_at < NOW() - INTERVAL '30 minutes';
END;
$$;

COMMENT ON FUNCTION cleanup_expired_auth_records() IS
    'Removes expired OTP and stale pending_registration rows. Run every 15 min.';