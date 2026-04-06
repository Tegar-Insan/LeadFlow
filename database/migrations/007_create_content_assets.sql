-- =============================================================================
-- LEADFLOW — 007_create_content_assets.sql
-- Increment : 3 — Content Scheduling
-- SRS Ref   : UC008 Upload Content Feed in Calendar
-- Depends   : 001–006 migrations
-- STORAGE   : Supabase Storage bucket 'content-assets'
--             Max file size: 50 MB (52,428,800 bytes) per STD TC008_04
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: content_assets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_assets (
    id                  UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_schedule_id   UUID                NOT NULL REFERENCES content_queue_schedules(id) ON DELETE CASCADE,
    uploaded_by         UUID                NOT NULL REFERENCES users(id) ON DELETE SET NULL,

    content_type        content_type_enum   NOT NULL,

    file_name           VARCHAR(500)        NOT NULL,
    file_size_bytes     BIGINT              NOT NULL,
    file_url            TEXT                NOT NULL,
    storage_path        TEXT                NOT NULL,
    mime_type           VARCHAR(100),
    duration_seconds    INT,
    thumbnail_url       TEXT,

    is_valid            BOOLEAN             NOT NULL DEFAULT TRUE,
    validation_error    TEXT,

    uploaded_at         TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  content_assets                 IS 'Media assets attached to schedule slots. Max 50MB. Private Supabase Storage.';
COMMENT ON COLUMN content_assets.file_url        IS 'Presigned Supabase Storage URL — passed to TikTok API for upload-by-URL publish.';
COMMENT ON COLUMN content_assets.storage_path    IS 'Internal bucket path used for replacement and deletion.';
COMMENT ON COLUMN content_assets.file_size_bytes IS 'Must be ≤ 52428800 (50MB). Enforced by Supabase Storage + backend validator.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_queue_schedule ON content_assets (queue_schedule_id);
CREATE INDEX IF NOT EXISTS idx_assets_uploaded_by    ON content_assets (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_assets_content_type   ON content_assets (content_type);

-- ---------------------------------------------------------------------------
-- TRIGGER: advance schedule status → 'uploaded' on first asset insert (UC008)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_asset_upload_advance_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE content_queue_schedules
    SET    status     = 'uploaded',
           updated_at = NOW()
    WHERE  id     = NEW.queue_schedule_id
      AND  status IN ('draft', 'scheduled');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asset_upload_advance_schedule_status ON content_assets;
CREATE TRIGGER trg_asset_upload_advance_schedule_status
    AFTER INSERT ON content_assets
    FOR EACH ROW EXECUTE FUNCTION trigger_asset_upload_advance_status();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE content_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_assets_admin_all   ON content_assets;
DROP POLICY IF EXISTS rls_assets_staff_all   ON content_assets;
DROP POLICY IF EXISTS rls_assets_owner_read  ON content_assets;

CREATE POLICY rls_assets_admin_all ON content_assets
    FOR ALL USING (get_caller_role() = 'admin');

CREATE POLICY rls_assets_staff_all ON content_assets
    FOR ALL USING (get_caller_role() = 'marketing_staff');

CREATE POLICY rls_assets_owner_read ON content_assets
    FOR SELECT USING (get_caller_role() = 'business_owner');