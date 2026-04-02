-- =============================================================================
-- LEADFLOW — 009_create_tiktok_accounts.sql
-- Increment : 4 — TikTok Business API Integration
-- Contains  : tiktok_accounts table + token_refresh_log + FK patch for 006 +
--             connection status trigger + status view + RLS
-- SRS Ref   : UC010 Fetch Data Interaction (OAuth setup)
-- SDS Ref   : Section 5.4 — TikTokAccount class
--             Section 5.5 — Entity: TikTokAccount — Data Dict
--             Section 5.6 — Software Interface: TikTok Business API (TT-API V2)
-- Depends   : 001–008 migrations
-- SECURITY  : OAuth tokens stored AES-256 encrypted at application layer.
--             Key = env TIKTOK_TOKEN_ENCRYPTION_KEY (32 byte hex).
--             Raw tokens NEVER stored in DB. Decrypted only in Node.js backend.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: tiktok_accounts
-- Stores Krench Chicken's TikTok Business Account OAuth 2.0 connection.
-- Single business account — table designed for one record in production.
-- SDS Entity: TikTokAccount
-- Attributes: tiktokAccountId, tiktokId, tiktokAccountName, tiktokComments,
--             tiktokMessage, musicType, connectedAt + token fields
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tiktok_accounts (
    id                          UUID                            PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id               UUID                            NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- TikTok identity (returned by OAuth 2.0 authorization)
    tiktok_open_id              VARCHAR(255)                    NOT NULL UNIQUE,    -- TikTok stable user ID
    tiktok_account_name         VARCHAR(255)                    NOT NULL,           -- @username
    tiktok_display_name         VARCHAR(255),
    tiktok_avatar_url           TEXT,
    tiktok_follower_count       INT                             NOT NULL DEFAULT 0,

    -- OAuth 2.0 Token Storage (AES-256 encrypted at application layer)
    -- NEVER store raw tokens — always encrypt before INSERT
    access_token_encrypted      TEXT                            NOT NULL,
    refresh_token_encrypted     TEXT                            NOT NULL,
    token_scope                 TEXT[],                                             -- granted scopes e.g. {video.publish, dm.list}
    access_token_expires_at     TIMESTAMPTZ                     NOT NULL,
    refresh_token_expires_at    TIMESTAMPTZ                     NOT NULL,

    -- Connection health
    connection_status           tiktok_connection_status_enum   NOT NULL DEFAULT 'connected',
    last_token_refresh_at       TIMESTAMPTZ,
    disconnect_reason           TEXT,                           -- reason if disconnected

    -- Content preferences (SDS TikTokAccount — musicType attribute)
    preferred_music_type        VARCHAR(100),                   -- e.g. "Indonesian pop"
    default_privacy             VARCHAR(50)                     NOT NULL DEFAULT 'PUBLIC_TO_EVERYONE',

    -- API metadata
    api_version                 VARCHAR(10)                     NOT NULL DEFAULT 'v2',
    last_sync_at                TIMESTAMPTZ,                    -- last interaction data fetch

    connected_at                TIMESTAMPTZ                     NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ                     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  tiktok_accounts                         IS 'Krench Chicken TikTok Business Account. OAuth 2.0 tokens AES-256 encrypted.';
COMMENT ON COLUMN tiktok_accounts.access_token_encrypted  IS 'AES-256 encrypted. Decrypted ONLY in Node.js before API calls. Never sent to frontend.';
COMMENT ON COLUMN tiktok_accounts.tiktok_open_id          IS 'TikTok stable open_id — primary reference for all TikTok API calls.';

CREATE INDEX idx_tiktok_owner         ON tiktok_accounts (owner_user_id);
CREATE INDEX idx_tiktok_open_id       ON tiktok_accounts (tiktok_open_id);
CREATE INDEX idx_tiktok_status        ON tiktok_accounts (connection_status);
CREATE INDEX idx_tiktok_token_exp     ON tiktok_accounts (access_token_expires_at);

-- Auto-update updated_at
CREATE TRIGGER trg_tiktok_accounts_updated_at
    BEFORE UPDATE ON tiktok_accounts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- TRIGGER: auto-mark token expired when expiry has passed
-- Defensive guard — Node.js scheduler handles proactive refresh,
-- but this ensures DB connection_status stays consistent.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_check_tiktok_token_expiry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.access_token_expires_at < NOW()
       AND NEW.connection_status = 'connected' THEN
        NEW.connection_status = 'token_expired';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tiktok_token_expiry
    BEFORE UPDATE ON tiktok_accounts
    FOR EACH ROW EXECUTE FUNCTION trigger_check_tiktok_token_expiry();

-- ---------------------------------------------------------------------------
-- TABLE: tiktok_token_refresh_log
-- Audit trail of every token refresh attempt by Node.js scheduler.
-- Append-only — helps diagnose TikTok OAuth issues in production.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tiktok_token_refresh_log (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tiktok_account_id   UUID        NOT NULL REFERENCES tiktok_accounts(id) ON DELETE CASCADE,
    success             BOOLEAN     NOT NULL,
    error_message       TEXT,
    new_expires_at      TIMESTAMPTZ,
    attempted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tiktok_token_refresh_log IS 'Append-only audit log of OAuth token refresh attempts. Diagnose TikTok API auth failures.';

CREATE INDEX idx_token_refresh_account ON tiktok_token_refresh_log (tiktok_account_id);
CREATE INDEX idx_token_refresh_time    ON tiktok_token_refresh_log (attempted_at DESC);

-- ---------------------------------------------------------------------------
-- FK PATCH: add tiktok_account_id FK to content_queue_schedules (006)
-- content_queue_schedules was created before tiktok_accounts existed.
-- Now that tiktok_accounts is created we add the constraint here.
-- ---------------------------------------------------------------------------
ALTER TABLE content_queue_schedules
    ADD CONSTRAINT fk_cqs_tiktok_account
    FOREIGN KEY (tiktok_account_id)
    REFERENCES tiktok_accounts(id)
    ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- VIEW: v_tiktok_account_status
-- Frontend connection panel — shows health without exposing tokens
-- Business Owner and Admin can see this
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_tiktok_account_status AS
SELECT
    ta.id,
    ta.tiktok_open_id,
    ta.tiktok_account_name,
    ta.tiktok_display_name,
    ta.tiktok_avatar_url,
    ta.tiktok_follower_count,
    ta.connection_status,
    ta.token_scope,
    ta.preferred_music_type,
    ta.default_privacy,
    ta.api_version,

    -- Token health indicators (no raw tokens exposed to view)
    (ta.access_token_expires_at  > NOW())   AS access_token_valid,
    (ta.refresh_token_expires_at > NOW())   AS refresh_token_valid,
    to_wib(ta.access_token_expires_at)      AS access_expires_wib,
    to_wib(ta.refresh_token_expires_at)     AS refresh_expires_wib,
    to_wib(ta.last_token_refresh_at)        AS last_refreshed_wib,
    to_wib(ta.last_sync_at)                 AS last_synced_wib,
    to_wib(ta.connected_at)                 AS connected_at_wib,

    up.full_name                            AS owner_name
FROM tiktok_accounts ta
LEFT JOIN user_profiles up ON up.user_id = ta.owner_user_id;

COMMENT ON VIEW v_tiktok_account_status IS 'Safe TikTok connection status. Encrypted tokens NEVER exposed. WIB timestamps.';

-- ---------------------------------------------------------------------------
-- RLS: tiktok_accounts
-- Admin: full access
-- Business Owner: read only (they own the account — dashboard monitoring)
-- Marketing Staff: read only (need to see connection status for publishing)
-- ---------------------------------------------------------------------------
ALTER TABLE tiktok_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_tiktok_admin_all ON tiktok_accounts
    FOR ALL USING (get_caller_role() = 'admin');

CREATE POLICY rls_tiktok_owner_read ON tiktok_accounts
    FOR SELECT USING (get_caller_role() = 'business_owner');

CREATE POLICY rls_tiktok_staff_read ON tiktok_accounts
    FOR SELECT USING (get_caller_role() = 'marketing_staff');

-- ---------------------------------------------------------------------------
-- RLS: tiktok_token_refresh_log
-- Admin only — this is an internal audit log
-- ---------------------------------------------------------------------------
ALTER TABLE tiktok_token_refresh_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_token_log_admin ON tiktok_token_refresh_log
    FOR ALL USING (get_caller_role() = 'admin');