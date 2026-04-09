-- =============================================================================
-- LEADFLOW — 006_create_content_queue_schedules.sql
-- Increment : 3 — Content Scheduling
-- SRS Ref   : UC007 Manage Content Schedule Queue
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PREREQUISITES: Extensions, Enums, Helper Functions
-- ---------------------------------------------------------------------------

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum: content workflow status
DO $$ BEGIN
    CREATE TYPE content_status_enum AS ENUM (
        'draft',
        'scheduled',
        'uploaded',
        'published',
        'failed'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum: content asset type
DO $$ BEGIN
    CREATE TYPE content_type_enum AS ENUM (
        'poster_photo',
        'short_video'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- WIB (GMT+7) display helper
CREATE OR REPLACE FUNCTION to_wib(ts TIMESTAMPTZ)
RETURNS TIMESTAMPTZ LANGUAGE sql IMMUTABLE AS $$
    SELECT ts AT TIME ZONE 'Asia/Jakarta';
$$;

-- Role helper — reads role from JWT claims set by backend middleware
-- Falls back to 'anonymous' if not set
CREATE OR REPLACE FUNCTION get_caller_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
    SELECT COALESCE(
        current_setting('app.user_role', TRUE),
        'anonymous'
    );
$$;

-- ---------------------------------------------------------------------------
-- TABLE: content_queue_schedules
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_queue_schedules (
    id                  UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id             UUID                REFERENCES content_ideas(id) ON DELETE CASCADE,

    -- tiktok_account_id FK added in 009_create_tiktok_accounts.sql
    tiktok_account_id   UUID,

    created_by          UUID                NOT NULL REFERENCES users(id) ON DELETE SET NULL,

    status              content_status_enum NOT NULL DEFAULT 'draft',
    priority_order      INT                 NOT NULL DEFAULT 0,
    scheduled_at        TIMESTAMPTZ,
    auto_publish        BOOLEAN             NOT NULL DEFAULT TRUE,

    -- Staff overrides for AI-generated content
    custom_caption      TEXT,
    custom_hashtags     TEXT[],
    custom_music_title  VARCHAR(255),

    -- TikTok publish settings
    platform            VARCHAR(50)         NOT NULL DEFAULT 'tiktok',
    privacy_level       VARCHAR(50)         NOT NULL DEFAULT 'PUBLIC_TO_EVERYONE',
    allow_comment       BOOLEAN             NOT NULL DEFAULT TRUE,
    allow_duet          BOOLEAN             NOT NULL DEFAULT FALSE,
    allow_stitch        BOOLEAN             NOT NULL DEFAULT FALSE,

    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    published_at        TIMESTAMPTZ,
    failed_at           TIMESTAMPTZ
);

COMMENT ON TABLE  content_queue_schedules              IS 'Core schedule queue. Draft auto-created on idea approval.';
COMMENT ON COLUMN content_queue_schedules.scheduled_at IS 'Stored UTC. Displayed WIB in UI. Cron polls every 60s.';
COMMENT ON COLUMN content_queue_schedules.priority_order IS 'Drag-drop order in calendar (UC007 NF13).';

-- idea_id is nullable: manual calendar posts have no linked AI idea (UC007).
-- This ALTER is idempotent — safe to re-run if the column was previously set NOT NULL.
ALTER TABLE content_queue_schedules ALTER COLUMN idea_id DROP NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cqs_status         ON content_queue_schedules (status);
CREATE INDEX IF NOT EXISTS idx_cqs_scheduled_at   ON content_queue_schedules (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_cqs_tiktok_account ON content_queue_schedules (tiktok_account_id);
CREATE INDEX IF NOT EXISTS idx_cqs_created_by     ON content_queue_schedules (created_by);
CREATE INDEX IF NOT EXISTS idx_cqs_idea_id        ON content_queue_schedules (idea_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_cqs_updated_at ON content_queue_schedules;
CREATE TRIGGER trg_cqs_updated_at
    BEFORE UPDATE ON content_queue_schedules
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- TRIGGER: auto-create DRAFT schedule when idea is APPROVED (UC006)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_auto_create_draft_schedule()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        INSERT INTO content_queue_schedules (
            idea_id,
            created_by,
            status,
            auto_publish
        ) VALUES (
            NEW.id,
            NEW.validated_by,
            'draft',
            TRUE
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_idea_approved_create_draft ON content_ideas;
CREATE TRIGGER trg_idea_approved_create_draft
    AFTER UPDATE ON content_ideas
    FOR EACH ROW EXECUTE FUNCTION trigger_auto_create_draft_schedule();

-- ---------------------------------------------------------------------------
-- VIEW: v_content_calendar
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_content_calendar AS
SELECT
    cqs.id                                              AS schedule_id,
    cqs.idea_id,
    cqs.tiktok_account_id,
    cqs.status,
    cqs.priority_order,
    cqs.auto_publish,
    cqs.privacy_level,
    cqs.allow_comment,
    cqs.allow_duet,
    cqs.allow_stitch,
    to_wib(cqs.scheduled_at)                            AS scheduled_at_wib,
    to_wib(cqs.published_at)                            AS published_at_wib,
    to_wib(cqs.failed_at)                               AS failed_at_wib,
    to_wib(cqs.created_at)                              AS created_at_wib,
    ci.idea_title,
    ci.hook,
    ci.estimated_duration,
    COALESCE(cqs.custom_caption,     ci.caption)        AS effective_caption,
    COALESCE(cqs.custom_hashtags,    ci.hashtags)       AS effective_hashtags,
    COALESCE(cqs.custom_music_title, ci.suggested_music) AS effective_music,
    up.full_name                                        AS created_by_name
FROM content_queue_schedules cqs
LEFT JOIN content_ideas   ci ON ci.id      = cqs.idea_id
LEFT JOIN user_profiles   up ON up.user_id = cqs.created_by;

-- ---------------------------------------------------------------------------
-- VIEW: v_publish_queue (used by auto-publish cron)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_publish_queue AS
SELECT
    cqs.id                  AS schedule_id,
    cqs.tiktok_account_id,
    cqs.scheduled_at,
    cqs.privacy_level,
    cqs.allow_comment,
    cqs.allow_duet,
    cqs.allow_stitch,
    COALESCE(cqs.custom_caption,  ci.caption)   AS caption,
    COALESCE(cqs.custom_hashtags, ci.hashtags)  AS hashtags,
    ci.idea_title
FROM content_queue_schedules cqs
LEFT JOIN content_ideas ci ON ci.id = cqs.idea_id
WHERE cqs.status       = 'uploaded'
  AND cqs.auto_publish  = TRUE
  AND cqs.scheduled_at <= NOW();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE content_queue_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_cqs_admin_all    ON content_queue_schedules;
DROP POLICY IF EXISTS rls_cqs_staff_all    ON content_queue_schedules;
DROP POLICY IF EXISTS rls_cqs_owner_read   ON content_queue_schedules;

CREATE POLICY rls_cqs_admin_all ON content_queue_schedules
    FOR ALL USING (get_caller_role() = 'admin');

CREATE POLICY rls_cqs_staff_all ON content_queue_schedules
    FOR ALL USING (get_caller_role() = 'marketing_staff');

CREATE POLICY rls_cqs_owner_read ON content_queue_schedules
    FOR SELECT USING (get_caller_role() = 'business_owner');