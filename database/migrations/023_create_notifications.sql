-- =============================================================================
-- LEADFLOW — 023_create_notifications.sql
-- Persistent notification center (bell icon + dropdown). Read/unread state
-- must survive refresh/logout/device switch, so this is a real table rather
-- than client-side React/localStorage state.
-- Sources (confirmed with user): UC009 publish status (success/failure),
-- new schedule comments, TikTok connection-state changes, UC006 idea
-- approve/reject. New events are pushed live over the existing Socket.IO
-- connection (server.ts already auto-joins every connected socket to a
-- `user:${userId}` room — notificationWebSocketService.ts reuses that room).
-- Depends: 001_Create_roles.sql, 002_Create_users.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(40) NOT NULL CHECK (type IN (
                                    'publish_success',
                                    'publish_failed',
                                    'comment_added',
                                    'tiktok_disconnected',
                                    'idea_approved',
                                    'idea_rejected'
                                )),
    title           VARCHAR(150) NOT NULL,
    message         TEXT        NOT NULL,
    related_id      UUID,
    is_read         BOOLEAN     NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  notifications IS
    'Persistent notification center entries. Read/unread state survives refresh and device switch (unlike the ephemeral Toast popups in NotificationContext.tsx).';
COMMENT ON COLUMN notifications.related_id IS
    'Optional FK-by-convention to the source row (content_queue_schedules.id, content_ideas.id, schedule_comments.id, or tiktok_accounts.id depending on type). Not a DB-level FK because the source table varies by type.';

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications (user_id, is_read, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS — ownership-based, same pattern as chatbot_sessions (migration 022).
-- Backend uses the service-role key and bypasses RLS for normal operation;
-- these policies are defensive and match project convention of enabling RLS
-- on every table.
-- ---------------------------------------------------------------------------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_notifications_own ON notifications
    FOR ALL
    USING (get_caller_user_id() = user_id)
    WITH CHECK (get_caller_user_id() = user_id);

CREATE POLICY rls_notifications_admin_read ON notifications
    FOR SELECT
    USING (get_caller_role() = 'admin');

-- ---------------------------------------------------------------------------
-- GRANTs (per lessons-learned: new tables must include GRANTs explicitly)
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
