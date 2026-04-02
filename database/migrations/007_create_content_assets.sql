-- =============================================================================
-- LEADFLOW — 007_create_content_assets.sql
-- Increment : 3 — Content Scheduling
-- Contains  : content_assets table + status-advance trigger + RLS
-- SRS Ref   : UC008 Upload Content Feed in Calendar
-- SDS Ref   : Section 5.4 — ContentAsset class
--             Section 5.5 — Entity: ContentAsset — Data Dict <ContentAsset>
--             Section 5.8 — SD011 Upload Content Feed in Calendar
--             Section 5.6 — Hardware Interface: upload via browser
-- STD Ref   : TC008_01 – TC008_04 (poster, multi-poster, video, >50MB)
-- Depends   : 001–006 migrations
-- STORAGE   : Files stored in Supabase Storage bucket 'content-assets' (private)
--             Max file size: 50 MB (52,428,800 bytes) per STD TC008_04
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: content_assets
-- Media files (photo/video) attached to a schedule slot.
-- One slot can have multiple assets (carousel support).
-- Status of parent schedule advances to 'uploaded' on first INSERT (trigger).
-- SDS Entity: ContentAsset
-- Attributes: assetId, queueCalendarId, fileSize, filename, contentType
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_assets (
    id                  UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_schedule_id   UUID                NOT NULL REFERENCES content_queue_schedules(id) ON DELETE CASCADE,
    uploaded_by         UUID                NOT NULL REFERENCES users(id) ON DELETE SET NULL,

    -- File classification
    content_type        content_type_enum   NOT NULL,       -- poster_photo | short_video

    -- File metadata
    file_name           VARCHAR(500)        NOT NULL,
    file_size_bytes     BIGINT              NOT NULL,        -- max 52,428,800 (50 MB)
    file_url            TEXT                NOT NULL,        -- Supabase Storage public URL
    storage_path        TEXT                NOT NULL,        -- bucket path for delete/replace
    mime_type           VARCHAR(100),                        -- e.g. video/mp4, image/png
    duration_seconds    INT,                                 -- video length (videos only)
    thumbnail_url       TEXT,                                -- auto-generated preview image

    -- Validation flags
    is_valid            BOOLEAN             NOT NULL DEFAULT TRUE,
    validation_error    TEXT,               -- populated if file fails validation

    uploaded_at         TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  content_assets               IS 'Media assets attached to schedule slots. Max 50MB per file (STD TC008_04). Private Supabase Storage.';
COMMENT ON COLUMN content_assets.file_url      IS 'Presigned Supabase Storage URL — passed to TikTok API for upload-by-URL publish.';
COMMENT ON COLUMN content_assets.storage_path  IS 'Internal bucket path used for replacement (UC008 AF1) and deletion.';
COMMENT ON COLUMN content_assets.file_size_bytes IS 'Must be ≤ 52428800 (50MB). Enforced by Supabase Storage + backend validator.';

CREATE INDEX idx_assets_queue_schedule ON content_assets (queue_schedule_id);
CREATE INDEX idx_assets_uploaded_by    ON content_assets (uploaded_by);
CREATE INDEX idx_assets_content_type   ON content_assets (content_type);

-- ---------------------------------------------------------------------------
-- TRIGGER: advance schedule status → 'uploaded' when first asset is attached
-- SDS UC008 Postcondition: "content status is saved as Uploaded for Publishing"
-- SRS US008 NF9: "system updates the content status to Uploaded for Publishing"
-- Only advances status — never reverts (draft → scheduled → uploaded).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_asset_upload_advance_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE content_queue_schedules
    SET    status     = 'uploaded',
           updated_at = NOW()
    WHERE  id = NEW.queue_schedule_id
      AND  status IN ('draft', 'scheduled');      -- only advance, never revert
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_asset_upload_advance_schedule_status
    AFTER INSERT ON content_assets
    FOR EACH ROW EXECUTE FUNCTION trigger_asset_upload_advance_status();

-- ---------------------------------------------------------------------------
-- RLS: content_assets
-- Marketing Staff: full CRUD (upload, replace, delete)
-- Business Owner: read only
-- Admin: full access
-- ---------------------------------------------------------------------------
ALTER TABLE content_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_assets_admin_all ON content_assets
    FOR ALL USING (get_caller_role() = 'admin');

CREATE POLICY rls_assets_staff_all ON content_assets
    FOR ALL USING (get_caller_role() = 'marketing_staff');

CREATE POLICY rls_assets_owner_read ON content_assets
    FOR SELECT USING (get_caller_role() = 'business_owner');