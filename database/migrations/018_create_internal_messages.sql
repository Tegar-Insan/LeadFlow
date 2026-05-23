-- =============================================================================
-- LEADFLOW — 018_create_internal_messages.sql
-- Internal User-to-User Messaging
-- Contains  : internal_messages table + RLS policies
-- Depends   : 001–017 migrations (roles, users)
-- Purpose   : Enable marketing staff and business owner to send/receive
--             direct messages within LeadFlow platform
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: internal_messages
-- Stores internal direct messages between authenticated users
-- Purpose: UC013 Manage Interaction Message (internal communications)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS internal_messages (
    id                  UUID                        PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id           UUID                        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id         UUID                        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Message content
    message_text        TEXT                        NOT NULL,
    is_read             BOOLEAN                     NOT NULL DEFAULT FALSE,
    
    -- Timestamps
    created_at          TIMESTAMPTZ                 NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ                 NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE internal_messages IS 'Internal direct messages between authenticated LeadFlow users.';
COMMENT ON COLUMN internal_messages.sender_id IS 'User sending the message (marketing_staff or business_owner).';
COMMENT ON COLUMN internal_messages.receiver_id IS 'User receiving the message (marketing_staff or business_owner).';
COMMENT ON COLUMN internal_messages.is_read IS 'Message read status (for unread badge in future phases).';

-- Indexes for performance
CREATE INDEX idx_im_sender_receiver ON internal_messages (sender_id, receiver_id);
CREATE INDEX idx_im_receiver_id ON internal_messages (receiver_id);
CREATE INDEX idx_im_created_at ON internal_messages (created_at DESC);
CREATE INDEX idx_im_conversation ON internal_messages ((CASE WHEN sender_id < receiver_id THEN sender_id ELSE receiver_id END),
                                                       (CASE WHEN sender_id < receiver_id THEN receiver_id ELSE sender_id END),
                                                       created_at DESC);

-- Auto-update updated_at
CREATE TRIGGER trg_im_updated_at
    BEFORE UPDATE ON internal_messages
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: internal_messages
-- Marketing Staff: Can send/receive messages to/from other staff and business owner
-- Business Owner: Can send/receive messages to/from marketing staff
-- Admin: Full access (read-only, for auditing)
-- ---------------------------------------------------------------------------
ALTER TABLE internal_messages ENABLE ROW LEVEL SECURITY;

-- Admin: Full access
CREATE POLICY rls_im_admin_all ON internal_messages
    FOR ALL USING (get_caller_role() = 'admin');

-- Marketing Staff: Can view messages where they are sender or receiver
CREATE POLICY rls_im_staff_select ON internal_messages
    FOR SELECT USING (
        get_caller_role() = 'marketing_staff' 
        AND (sender_id = get_caller_user_id() OR receiver_id = get_caller_user_id())
    );

-- Marketing Staff: Can insert (send) messages
CREATE POLICY rls_im_staff_insert ON internal_messages
    FOR INSERT WITH CHECK (
        get_caller_role() = 'marketing_staff'
        AND sender_id = get_caller_user_id()
    );

-- Marketing Staff: Can update messages they sent (mark as read, soft delete flag)
CREATE POLICY rls_im_staff_update ON internal_messages
    FOR UPDATE USING (
        get_caller_role() = 'marketing_staff'
        AND (sender_id = get_caller_user_id() OR receiver_id = get_caller_user_id())
    );

-- Marketing Staff: Can delete messages they sent
CREATE POLICY rls_im_staff_delete ON internal_messages
    FOR DELETE USING (
        get_caller_role() = 'marketing_staff'
        AND sender_id = get_caller_user_id()
    );

-- Business Owner: Can view messages where they are sender or receiver
CREATE POLICY rls_im_owner_select ON internal_messages
    FOR SELECT USING (
        get_caller_role() = 'business_owner'
        AND (sender_id = get_caller_user_id() OR receiver_id = get_caller_user_id())
    );

-- Business Owner: Can insert (send) messages
CREATE POLICY rls_im_owner_insert ON internal_messages
    FOR INSERT WITH CHECK (
        get_caller_role() = 'business_owner'
        AND sender_id = get_caller_user_id()
    );

-- Business Owner: Can update messages they participate in
CREATE POLICY rls_im_owner_update ON internal_messages
    FOR UPDATE USING (
        get_caller_role() = 'business_owner'
        AND (sender_id = get_caller_user_id() OR receiver_id = get_caller_user_id())
    );

-- Business Owner: Can delete messages they sent
CREATE POLICY rls_im_owner_delete ON internal_messages
    FOR DELETE USING (
        get_caller_role() = 'business_owner'
        AND sender_id = get_caller_user_id()
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON internal_messages TO authenticated;
