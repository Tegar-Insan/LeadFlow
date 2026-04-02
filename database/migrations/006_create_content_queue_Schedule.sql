-- =============================================================================
-- LEADFLOW — 006_create_content_queue_schedules.sql
-- Increment : 3 — Content Scheduling
-- Contains  : content_queue_schedules table + auto-draft trigger +
--             calendar view + publish queue view + RLS
-- SRS Ref   : UC007 Manage Content Schedule Queue
-- SDS Ref   : Section 5.4 — ContentQueueSchedule class
--             Section 5.5 — Entity: ContentQueueSchedule — Data Dict
--             Section 5.8 — SD007 Add, SD008 Edit, SD009 Remove, SD010 Filter
--             Section 6   — UI: Management Content Schedule Queue Page
-- Depends   : 001–005 migrations
-- FK NOTE   : tiktok_account_id FK is added via ALTER TABLE in
--             009_create_tiktok_accounts.sql (avoids forward reference)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: content_queue_schedules
-- Central scheduling engine of LeadFlow.
-- Draft row auto-created when content_idea status → 'approved' (trigger below).
-- Marketing Staff then sets scheduled_at and attaches media asset.
-- SDS Entity: ContentQueueSchedule
-- Attributes: queueCalendarId, ideaId, createdBy, priorityOrderSchedule,
--             contentStatus, tiktokConnected, scheduledAt, autoPublish
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_queue_schedules (
    id                  UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    idea_id             UUID                NOT NULL REFERENCES content_ideas(id) ON DELETE CASCADE,

    -- tiktok_account_id — FK added in 009_create_tiktok_accounts.sql
    -- Stored here as plain UUID until tiktok_accounts table exists
    tiktok_account_id   UUID,

    created_by          UUID                NOT NULL REFERENCES users(id) ON DELETE SET NULL,

    -- Scheduling control
    status              content_status_enum NOT NULL DEFAULT 'draft',
    priority_order      INT                 NOT NULL DEFAULT 0,     -- drag-drop ordering (UC007 NF13)
    scheduled_at        TIMESTAMPTZ,                                -- UTC stored, WIB displayed
    auto_publish        BOOLEAN             NOT NULL DEFAULT TRUE,  -- trigger TikTok API at scheduled_at

    -- Content field overrides — staff can edit AI-generated values (UC007 AF1)
    custom_caption      TEXT,
    custom_hashtags     TEXT[],
    custom_music_title  VARCHAR(255),

    -- TikTok publish settings
    platform            VARCHAR(50)         NOT NULL DEFAULT 'tiktok',
    privacy_level       VARCHAR(50)         NOT NULL DEFAULT 'PUBLIC_TO_EVERYONE',
    allow_comment       BOOLEAN             NOT NULL DEFAULT TRUE,
    allow_duet          BOOLEAN             NOT NULL DEFAULT FALSE,
    allow_stitch        BOOLEAN             NOT NULL DEFAULT FALSE,

    -- Timestamps (all UTC — displayed as WIB in UI)
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    published_at        TIMESTAMPTZ,        -- set when publish succeeds
    failed_at           TIMESTAMPTZ         -- set when publish fails
);

COMMENT ON TABLE  content_queue_schedules            IS 'Core schedule queue. Draft auto-created on idea approval. Staff sets time + uploads media.';
COMMENT ON COLUMN content_queue_schedules.scheduled_at IS 'Stored UTC. Node.js cron polls this every 60s. Displayed WIB in UI.';
COMMENT ON COLUMN content_queue_schedules.priority_order IS 'Drag-drop order in calendar (UC007 NF13). Lower = higher on screen.';
COMMENT ON COLUMN content_queue_schedules.tiktok_account_id IS 'FK constraint added in 009_create_tiktok_accounts.sql.';

CREATE INDEX idx_cqs_status         ON content_queue_schedules (status);
CREATE INDEX idx_cqs_scheduled_at   ON content_queue_schedules (scheduled_at) WHERE status = 'uploaded';
CREATE INDEX idx_cqs_tiktok_account ON content_queue_schedules (tiktok_account_id);
CREATE INDEX idx_cqs_created_by     ON content_queue_schedules (created_by);
CREATE INDEX idx_cqs_idea_id        ON content_queue_schedules (idea_id);

-- Auto-update updated_at
CREATE TRIGGER trg_cqs_updated_at
    BEFORE UPDATE ON content_queue_schedules
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- TRIGGER: auto-create DRAFT schedule when idea is APPROVED
-- SDS UC006 Postcondition:
--   "Approved content ideas are automatically created as Draft entries
--    in the content calendar."
-- SRS US006 NF7: "system automatically creates a draft schedule entry"
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_auto_create_draft_schedule()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Only fire on transition TO 'approved'
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        INSERT INTO content_queue_schedules (
            idea_id,
            created_by,
            status,
            auto_publish
        ) VALUES (
            NEW.id,
            NEW.validated_by,       -- the staff member who approved it
            'draft',
            TRUE
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_idea_approved_create_draft
    AFTER UPDATE ON content_ideas
    FOR EACH ROW EXECUTE FUNCTION trigger_auto_create_draft_schedule();

-- ---------------------------------------------------------------------------
-- VIEW: v_content_calendar
-- Full calendar view for Marketing Staff UI (UC007).
-- Joins schedule + idea + last publish result. WIB timestamps.
-- Uses COALESCE to give staff overrides priority over AI defaults.
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

    -- Display WIB (GMT+7)
    to_wib(cqs.scheduled_at)                            AS scheduled_at_wib,
    to_wib(cqs.published_at)                            AS published_at_wib,
    to_wib(cqs.failed_at)                               AS failed_at_wib,
    to_wib(cqs.created_at)                              AS created_at_wib,

    -- AI-generated idea fields
    ci.idea_title,
    ci.hook,
    ci.estimated_duration,

    -- COALESCE: staff custom override takes priority over AI-generated default
    COALESCE(cqs.custom_caption,    ci.caption)         AS effective_caption,
    COALESCE(cqs.custom_hashtags,   ci.hashtags)        AS effective_hashtags,
    COALESCE(cqs.custom_music_title, ci.suggested_music) AS effective_music,

    -- Creator
    up.full_name                                        AS created_by_name

FROM content_queue_schedules cqs
JOIN  content_ideas  ci ON ci.id     = cqs.idea_id
LEFT JOIN user_profiles up ON up.user_id = cqs.created_by;

COMMENT ON VIEW v_content_calendar IS 'Calendar UI view. COALESCE gives staff overrides priority over AI defaults. WIB timestamps.';

-- ---------------------------------------------------------------------------
-- VIEW: v_publish_queue
-- Used by Node.js auto-publish cron job (runs every 60 seconds).
-- Returns only content that is due to publish NOW (status=uploaded, past due).
-- Asset and token joined here so backend has everything in one query.
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
JOIN content_ideas ci ON ci.id = cqs.idea_id
WHERE cqs.status       = 'uploaded'
  AND cqs.auto_publish  = TRUE
  AND cqs.scheduled_at <= NOW();

COMMENT ON VIEW v_publish_queue IS 'Auto-publish queue. Polled by Node.js scheduler every 60 seconds. Backend joins token from tiktok_accounts.';

-- ---------------------------------------------------------------------------
-- RLS: content_queue_schedules
-- Marketing Staff: full CRUD
-- Business Owner: read only
-- Admin: full access
-- ---------------------------------------------------------------------------
ALTER TABLE content_queue_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_cqs_admin_all ON content_queue_schedules
    FOR ALL USING (get_caller_role() = 'admin');

CREATE POLICY rls_cqs_staff_all ON content_queue_schedules
    FOR ALL USING (get_caller_role() = 'marketing_staff');

CREATE POLICY rls_cqs_owner_read ON content_queue_schedules
    FOR SELECT USING (get_caller_role() = 'business_owner');