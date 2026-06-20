-- =============================================================================
-- LEADFLOW — 022_create_chatbot_sessions.sql
-- Long-term memory for the AI chat assistant (chatbotController.ts / Anthropic
-- Claude). Before this migration, conversation history lived only in React
-- state on the client and was re-sent in full on every turn — nothing
-- persisted, so context was lost on refresh/navigation and grew unbounded
-- client-side. This introduces a server-owned session + message log so the
-- backend can resume a user's conversation and apply a sliding context
-- window, the same pattern Claude.ai/Anthropic-style chat clients use.
-- One continuous global thread per user — shared by the floating AIChatbot
-- FAB, /content/prompt, and /content/validate (all render the same chat UI).
-- SRS Ref: UC Chatbot (AI Assistant) — supports UC004/UC005 conversational flow
-- Depends: 001_Create_roles.sql, 002_Create_users.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: chatbot_sessions
-- One row per conversation thread. Currently one active thread per user
-- (resumed everywhere), but modeled as 1-to-many to allow future history
-- (e.g. "past conversations" list) without a schema change.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chatbot_sessions (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               VARCHAR(255),
    last_message_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  chatbot_sessions IS
    'AI chat assistant conversation threads. Long-term memory for chatbotController.ts (Anthropic Claude).';
COMMENT ON COLUMN chatbot_sessions.title IS
    'Optional short label, e.g. derived from the first user message. NULL until set.';
COMMENT ON COLUMN chatbot_sessions.last_message_at IS
    'Bumped by trg_chatbot_messages_touch_session on every new message. Used to resolve "the latest session" on resume.';

CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_user
    ON chatbot_sessions (user_id, last_message_at DESC);

DROP TRIGGER IF EXISTS trg_chatbot_sessions_updated_at ON chatbot_sessions;
CREATE TRIGGER trg_chatbot_sessions_updated_at
    BEFORE UPDATE ON chatbot_sessions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- TABLE: chatbot_messages
-- Append-only message log per session. `schedules` stores the raw AI-proposed
-- %%SCHEDULE%% blocks (see anthropicService.ts) so the Approve/Reject UI can
-- be reconstructed after a session resume, exactly as it appeared live.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chatbot_messages (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id          UUID        NOT NULL REFERENCES chatbot_sessions(id) ON DELETE CASCADE,
    role                VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
    content             TEXT        NOT NULL,
    message_type        VARCHAR(30) NOT NULL DEFAULT 'text'
                                     CHECK (message_type IN ('text', 'schedule_recommendation')),
    schedules           JSONB,
    ai_model_used       VARCHAR(50),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  chatbot_messages IS
    'Append-only turn log for chatbot_sessions. Never updated or deleted (audit + replay).';
COMMENT ON COLUMN chatbot_messages.schedules IS
    'JSONB array of AI-proposed schedule recommendations parsed from %%SCHEDULE%% blocks. NULL for plain text turns.';
COMMENT ON COLUMN chatbot_messages.ai_model_used IS
    'Anthropic model id used for this assistant turn (e.g. claude-sonnet-4-6). NULL on user turns.';

CREATE INDEX IF NOT EXISTS idx_chatbot_messages_session
    ON chatbot_messages (session_id, created_at);

-- ---------------------------------------------------------------------------
-- TRIGGER: bump parent session's last_message_at on every new message
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_touch_chatbot_session()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE chatbot_sessions
    SET last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chatbot_messages_touch_session ON chatbot_messages;
CREATE TRIGGER trg_chatbot_messages_touch_session
    AFTER INSERT ON chatbot_messages
    FOR EACH ROW EXECUTE FUNCTION trigger_touch_chatbot_session();

-- ---------------------------------------------------------------------------
-- RLS
-- Ownership-based (not role-based) — chatbotRoutes.ts currently allows any
-- authenticated user to chat, so access here is gated purely by user_id.
-- Admin keeps read-only oversight, matching the project's admin-all-read
-- convention used elsewhere (e.g. schedule_comments).
-- ---------------------------------------------------------------------------
ALTER TABLE chatbot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_chatbot_sessions_own ON chatbot_sessions
    FOR ALL
    USING (get_caller_user_id() = user_id)
    WITH CHECK (get_caller_user_id() = user_id);

CREATE POLICY rls_chatbot_sessions_admin_read ON chatbot_sessions
    FOR SELECT
    USING (get_caller_role() = 'admin');

CREATE POLICY rls_chatbot_messages_own ON chatbot_messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM chatbot_sessions cs
            WHERE cs.id = chatbot_messages.session_id
              AND cs.user_id = get_caller_user_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chatbot_sessions cs
            WHERE cs.id = chatbot_messages.session_id
              AND cs.user_id = get_caller_user_id()
        )
    );

CREATE POLICY rls_chatbot_messages_admin_read ON chatbot_messages
    FOR SELECT
    USING (get_caller_role() = 'admin');

-- ---------------------------------------------------------------------------
-- GRANTs (per lessons-learned: new tables must include GRANTs explicitly)
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON chatbot_sessions TO authenticated;
GRANT SELECT, INSERT                 ON chatbot_messages TO authenticated;
