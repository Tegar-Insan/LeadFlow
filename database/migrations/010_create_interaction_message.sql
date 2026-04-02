-- =============================================================================
-- LEADFLOW — 010_create_interaction_messages.sql
-- Increment : 5 — AI Classifier & Interaction Management
-- Contains  : interaction_messages table + inbox view + RLS
-- SRS Ref   : UC010 Fetch Data Interaction, UC012 Manage Interaction Message
-- SDS Ref   : Section 5.4 — InteractionMessage class
--             Section 5.5 — Entity: InteractionMessage — Data Dict
--             Section 5.8 — SD013 Fetch, SD015 Create msg, SD016 Remove msg
-- STD Ref   : TC010_01, TC010_02, TC012_01–TC012_05
-- Depends   : 001–009 migrations
-- NOTE      : Classification results stored in 011_create_classify_type_messages.sql
--             Unified inbox = comments + DMs in one table (channel_type column)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: interaction_messages
-- Unified inbox — raw TikTok interactions fetched via Business API (UC010).
-- Both comments (public) and DMs (direct messages) stored here.
-- tiktok_message_id UNIQUE prevents duplicate rows on repeated syncs.
-- SDS Entity: InteractionMessage
-- Attributes: interactionId, interactionTypeId, interactionTypeName,
--             tiktokAccountId, messageText, channelType, totalAmountSent
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interaction_messages (
    id                      UUID                        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tiktok_account_id       UUID                        NOT NULL REFERENCES tiktok_accounts(id) ON DELETE CASCADE,
    publish_log_id          UUID                        REFERENCES publish_status_logs(id) ON DELETE SET NULL,

    -- TikTok native identifiers (deduplication key)
    tiktok_message_id       VARCHAR(255)                NOT NULL UNIQUE,    -- TikTok's own message/comment ID
    tiktok_post_id          VARCHAR(255),                                   -- source post (NULL for DMs)
    tiktok_user_handle      VARCHAR(255),                                   -- sender @handle
    tiktok_user_id          VARCHAR(255),                                   -- sender TikTok user ID

    -- Message content
    channel_type            channel_type_enum           NOT NULL,           -- comment | dm
    message_text            TEXT                        NOT NULL,
    parent_message_id       VARCHAR(255),                                   -- for threaded comment replies

    -- Classification state (updated by trigger in 011)
    classification_status   interaction_status_enum     NOT NULL DEFAULT 'unclassified',

    -- Response tracking (UC012 Manage Interaction Message)
    response_text           TEXT,                                           -- reply drafted/sent
    response_sent_at        TIMESTAMPTZ,
    response_status         send_status_enum            NOT NULL DEFAULT 'pending',
    responded_by            UUID                        REFERENCES users(id) ON DELETE SET NULL,
    amount_message_sent     INT                         NOT NULL DEFAULT 0,  -- SDS: totalAmountSent

    -- Fetch metadata
    message_created_at      TIMESTAMPTZ,                                    -- original TikTok timestamp
    fetched_at              TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ                 NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  interaction_messages               IS 'Unified inbox: comments + DMs. UNIQUE on tiktok_message_id prevents duplicate fetches.';
COMMENT ON COLUMN interaction_messages.channel_type  IS 'comment = public post comment; dm = TikTok direct message.';
COMMENT ON COLUMN interaction_messages.tiktok_message_id IS 'TikTok native ID. UNIQUE — prevents duplicates on repeated API syncs.';
COMMENT ON COLUMN interaction_messages.amount_message_sent IS 'Counter of replies sent from LeadFlow for this interaction (UC012).';

-- Standard indexes
CREATE INDEX idx_im_tiktok_account  ON interaction_messages (tiktok_account_id);
CREATE INDEX idx_im_channel         ON interaction_messages (channel_type);
CREATE INDEX idx_im_status          ON interaction_messages (classification_status);
CREATE INDEX idx_im_post_id         ON interaction_messages (tiktok_post_id);
CREATE INDEX idx_im_fetched         ON interaction_messages (fetched_at DESC);
CREATE INDEX idx_im_msg_created     ON interaction_messages (message_created_at DESC);

-- Full-text search on message content (pg_trgm — for inbox filter/search)
CREATE INDEX idx_im_message_trgm ON interaction_messages
    USING GIN (message_text gin_trgm_ops);

-- Auto-update updated_at
CREATE TRIGGER trg_im_updated_at
    BEFORE UPDATE ON interaction_messages
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- NOTE: v_interaction_inbox view is created in 011_create_classify_type_messages.sql
-- because it depends on interaction_classifications table (created in 011).

-- ---------------------------------------------------------------------------
-- RLS: interaction_messages
-- Marketing Staff: full CRUD (view, filter, respond, archive)
-- Business Owner: read only (can monitor but not respond)
-- Admin: full access
-- ---------------------------------------------------------------------------
ALTER TABLE interaction_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_im_admin_all ON interaction_messages
    FOR ALL USING (get_caller_role() = 'admin');

CREATE POLICY rls_im_staff_all ON interaction_messages
    FOR ALL USING (get_caller_role() = 'marketing_staff');

CREATE POLICY rls_im_owner_read ON interaction_messages
    FOR SELECT USING (get_caller_role() = 'business_owner');