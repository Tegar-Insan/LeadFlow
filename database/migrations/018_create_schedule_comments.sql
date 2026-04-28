-- =============================================================================
-- LEADFLOW — 018_create_schedule_comments.sql
-- Increment : 3 — Content Management Module (Session 9)
-- Contains  : schedule_comments table + draft-only insert trigger + RLS + GRANTs
-- SRS Ref   : UC015 Comment Marketing Staff Post (internal team review on drafts)
-- Stakeholder Rule #4 (Session 9):
--   "If content schedule is draft → marketing can comment.
--    If already published → they cannot comment."
-- Depends   : 001_Create_roles.sql, 002_Create_users.sql, 006_create_content_queue_Schedule.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: schedule_comments
-- Internal marketing-team comments on DRAFT schedules only.
-- This is NOT public TikTok comments — those live in interaction_messages (UC010).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedule_comments (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id     UUID        NOT NULL
                                REFERENCES content_queue_schedules(id) ON DELETE CASCADE,
    user_id         UUID
                                REFERENCES users(id) ON DELETE SET NULL,
    comment_text    TEXT        NOT NULL CHECK (length(trim(comment_text)) > 0),

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  schedule_comments IS
    'Internal marketing team comments on DRAFT content schedules (UC015). '
    'Locked once the schedule transitions away from draft — enforced by trigger below.';
COMMENT ON COLUMN schedule_comments.schedule_id IS
    'FK to content_queue_schedules. ON DELETE CASCADE because comments are subordinate to the schedule.';
COMMENT ON COLUMN schedule_comments.user_id IS
    'FK to users. ON DELETE SET NULL so deleting a staff account does not wipe the audit trail.';

CREATE INDEX idx_schedule_comments_schedule ON schedule_comments (schedule_id);
CREATE INDEX idx_schedule_comments_user     ON schedule_comments (user_id);
CREATE INDEX idx_schedule_comments_created  ON schedule_comments (created_at DESC);

-- Auto-update updated_at (reuses the shared trigger function from migration 001)
CREATE TRIGGER trg_schedule_comments_updated_at
    BEFORE UPDATE ON schedule_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- TRIGGER: draft-only insert guard (defense in depth)
-- Even if the API check is bypassed, PostgreSQL refuses the write.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_enforce_draft_only_comment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    parent_status content_status_enum;
BEGIN
    SELECT status INTO parent_status
    FROM content_queue_schedules
    WHERE id = NEW.schedule_id;

    IF parent_status IS NULL THEN
        RAISE EXCEPTION 'Schedule % not found', NEW.schedule_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF parent_status <> 'draft' THEN
        RAISE EXCEPTION
            'Comments are locked: schedule % has status %, only draft schedules accept comments',
            NEW.schedule_id, parent_status
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_schedule_comments_draft_only
    BEFORE INSERT ON schedule_comments
    FOR EACH ROW EXECUTE FUNCTION trigger_enforce_draft_only_comment();

-- ---------------------------------------------------------------------------
-- VIEW: v_schedule_comments_detail
-- Joins the comment with author display name for the UI CommentThread component.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_schedule_comments_detail AS
SELECT
    sc.id                       AS comment_id,
    sc.schedule_id,
    sc.comment_text,
    sc.user_id                  AS author_user_id,
    u.email                     AS author_email,
    up.full_name                AS author_name,
    up.profile_photo_url        AS author_photo_url,
    to_wib(sc.created_at)       AS created_at_wib,
    to_wib(sc.updated_at)       AS updated_at_wib
FROM schedule_comments sc
LEFT JOIN users         u  ON u.id  = sc.user_id
LEFT JOIN user_profiles up ON up.user_id = sc.user_id;

COMMENT ON VIEW v_schedule_comments_detail IS
    'CommentThread UI source. WIB timestamps. Left-joins survive deleted users (user_id SET NULL).';

-- ---------------------------------------------------------------------------
-- RLS
-- marketing_staff : full CRUD on schedule_comments (shared workspace — stakeholder rule #3)
-- admin           : read-only (oversight)
-- business_owner  : no access (they view dashboards, not internal drafts)
-- ---------------------------------------------------------------------------
ALTER TABLE schedule_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_schedule_comments_staff_all ON schedule_comments
    FOR ALL
    USING (get_caller_role() = 'marketing_staff')
    WITH CHECK (get_caller_role() = 'marketing_staff');

CREATE POLICY rls_schedule_comments_admin_read ON schedule_comments
    FOR SELECT
    USING (get_caller_role() = 'admin');

-- ---------------------------------------------------------------------------
-- GRANTs (per lessons-learned: new tables must include GRANTs explicitly)
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON schedule_comments TO authenticated;
GRANT SELECT                          ON v_schedule_comments_detail TO authenticated;

-- ---------------------------------------------------------------------------
-- Sanity check: confirm the trigger blocks a non-draft insert.
-- Run manually via Supabase SQL editor after migration:
--   INSERT INTO schedule_comments (schedule_id, user_id, comment_text)
--   VALUES ('<a published schedule id>', '<a staff user id>', 'should fail');
--   -- expected: ERROR: Comments are locked: schedule ... has status published ...
-- ---------------------------------------------------------------------------
