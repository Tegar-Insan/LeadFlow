-- =============================================================================
-- LEADFLOW — 008_create_publish_status_logs.sql
-- Increment : 3 — Content Scheduling
-- Contains  : publish_status_logs table + schedule-update trigger +
--             notification view + RLS
-- SRS Ref   : UC009 Notify Publish Status
-- SDS Ref   : Section 5.4 — PublishStatusLog class (PublishNotifyLog)
--             Section 5.5 — Entity: PublishStatusLog — Data Dict
--             Section 5.8 — SD012 Sequence: Notify Publish Status
-- STD Ref   : TC009_01 — Notify Publish Status
-- Depends   : 001–007 migrations
-- NOTE      : This table is APPEND-ONLY (no UPDATE, no DELETE).
--             Every publish attempt = one immutable row here.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: publish_status_logs
-- Append-only audit log of every TikTok auto-publish attempt.
-- Node.js publish service writes here after each API call.
-- INSERT trigger updates parent content_queue_schedules.status accordingly.
-- SDS Entity: PublishStatusLog (PublishNotifyLog in domain model)
-- Attributes: publishStatusId, queueCalendarId, statusCode, statusMessage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS publish_status_logs (
    id                  UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_schedule_id   UUID                NOT NULL REFERENCES content_queue_schedules(id) ON DELETE CASCADE,

    -- Publish attempt result
    result              publish_result_enum NOT NULL,
    http_status_code    INT,                    -- TikTok API HTTP response code (200, 400, 401...)
    tiktok_post_id      VARCHAR(255),           -- TikTok video ID returned on success
    status_message      TEXT,                   -- human-readable result message shown in UI
    error_detail        TEXT,                   -- raw API error JSON for debugging
    retry_count         INT                 NOT NULL DEFAULT 0,

    -- Attempt timing (stored UTC — displayed WIB in notification panel)
    attempted_at        TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  publish_status_logs              IS 'Append-only publish attempt log. One row per attempt. Never updated or deleted.';
COMMENT ON COLUMN publish_status_logs.tiktok_post_id IS 'TikTok video ID on success — used as reference for interaction fetching (UC010).';
COMMENT ON COLUMN publish_status_logs.error_detail   IS 'Raw TikTok API error stored for backend debugging. Not shown in UI.';

CREATE INDEX idx_psl_queue_schedule ON publish_status_logs (queue_schedule_id);
CREATE INDEX idx_psl_result         ON publish_status_logs (result);
CREATE INDEX idx_psl_attempted_at   ON publish_status_logs (attempted_at DESC);
CREATE INDEX idx_psl_tiktok_post_id ON publish_status_logs (tiktok_post_id) WHERE tiktok_post_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- TRIGGER: update content_queue_schedules.status after each publish attempt
-- SDS UC009 NF4: "system updates the content status in the content calendar"
-- SRS US009 NF4: "system updates the content status"
-- success → 'published', failed → 'failed'
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_publish_log_update_schedule_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.result = 'success' THEN
        UPDATE content_queue_schedules
        SET    status       = 'published',
               published_at = NEW.attempted_at,
               updated_at   = NOW()
        WHERE  id = NEW.queue_schedule_id;

    ELSIF NEW.result = 'failed' THEN
        UPDATE content_queue_schedules
        SET    status    = 'failed',
               failed_at = NEW.attempted_at,
               updated_at = NOW()
        WHERE  id = NEW.queue_schedule_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_publish_log_advance_schedule
    AFTER INSERT ON publish_status_logs
    FOR EACH ROW EXECUTE FUNCTION trigger_publish_log_update_schedule_status();

-- ---------------------------------------------------------------------------
-- VIEW: v_publish_notifications
-- Notification panel for Marketing Staff (UC009).
-- Shows latest publish result per schedule with WIB timestamps.
-- Ordered: failures first (need action), then recent successes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_publish_notifications AS
SELECT
    psl.id                              AS log_id,
    psl.queue_schedule_id,
    psl.result,
    psl.http_status_code,
    psl.tiktok_post_id,
    psl.status_message,
    psl.retry_count,
    to_wib(psl.attempted_at)            AS attempted_at_wib,

    -- Content context
    ci.idea_title,
    cqs.status                          AS current_schedule_status,
    to_wib(cqs.scheduled_at)            AS scheduled_at_wib,

    -- Sort order: failed first, then by recency
    CASE psl.result
        WHEN 'failed'   THEN 1
        WHEN 'retrying' THEN 2
        WHEN 'success'  THEN 3
    END                                 AS result_sort_order

FROM publish_status_logs psl
JOIN content_queue_schedules cqs ON cqs.id = psl.queue_schedule_id
JOIN content_ideas           ci  ON ci.id  = cqs.idea_id
ORDER BY result_sort_order ASC, psl.attempted_at DESC;

COMMENT ON VIEW v_publish_notifications IS 'Notification panel view. Failures surfaced first. WIB timestamps. UC009.';

-- ---------------------------------------------------------------------------
-- RLS: publish_status_logs
-- All authenticated roles can READ (Marketing Staff + Business Owner see notifications)
-- Only backend (admin service role) can INSERT — never from frontend directly
-- No UPDATE or DELETE (append-only design)
-- ---------------------------------------------------------------------------
ALTER TABLE publish_status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_psl_all_read ON publish_status_logs
    FOR SELECT USING (get_caller_role() IN ('admin', 'business_owner', 'marketing_staff'));

CREATE POLICY rls_psl_admin_insert ON publish_status_logs
    FOR INSERT WITH CHECK (get_caller_role() = 'admin');