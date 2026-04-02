-- ══════════════════════════════════════════════════════════════
-- LeadFlow · Migration 013 — Auth Support Tables
-- File: database/migrations/013_auth_otp_pending_registrations.sql
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS otp_verifications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT        NOT NULL,
    otp_hash    TEXT        NOT NULL,
    type        TEXT        NOT NULL CHECK (type IN ('register','login','reset')),
    expires_at  TIMESTAMPTZ NOT NULL,
    attempts    INTEGER     NOT NULL DEFAULT 0,
    verified    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT otp_email_type_uq UNIQUE (email, type)
);

CREATE INDEX IF NOT EXISTS idx_otp_email_type ON otp_verifications (email, type, verified);

CREATE TABLE IF NOT EXISTS pending_registrations (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    full_name     TEXT        NOT NULL,
    phone         TEXT,
    role_id       INTEGER     NOT NULL REFERENCES roles(roleid),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_reg_email ON pending_registrations (email);

ALTER TABLE otp_verifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;

-- Cleanup function — schedule via pg_cron or Supabase Edge Function every 15 min
CREATE OR REPLACE FUNCTION cleanup_expired_auth_records()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM otp_verifications     WHERE expires_at < NOW();
  DELETE FROM pending_registrations WHERE created_at < NOW() - INTERVAL '30 minutes';
END;
$$;

