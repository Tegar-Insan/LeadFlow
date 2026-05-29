-- =============================================================================
-- LEADFLOW — 019_fix_content_views_and_trigger.sql
-- Fixes stale column references after content_ideas column rename (session 9):
--   idea_title  → content_title
--   caption     → tiktok_caption
--   hashtags    → hashtag
--   hook        → DROPPED
-- Also fixes trigger to copy metadata into draft schedule on approve.
-- SRS Refs: UC006 Validate AI Content Ideas, UC007 Manage Content Schedule Queue
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Fix v_content_calendar
--    Was referencing ci.idea_title, ci.hook, ci.caption, ci.hashtags
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
    ci.content_title,
    ci.estimated_duration,
    COALESCE(cqs.custom_caption,      ci.tiktok_caption)  AS effective_caption,
    COALESCE(cqs.custom_hashtags,     ci.hashtag)         AS effective_hashtags,
    COALESCE(cqs.custom_music_title,  ci.suggested_music) AS effective_music,
    up.full_name                                          AS created_by_name
FROM content_queue_schedules cqs
LEFT JOIN content_ideas   ci ON ci.id      = cqs.idea_id
LEFT JOIN user_profiles   up ON up.user_id = cqs.created_by;

COMMENT ON VIEW v_content_calendar IS 'Calendar display view. Uses corrected content_ideas column names post-rename.';

-- ---------------------------------------------------------------------------
-- 2. Fix v_publish_queue (auto-publish cron)
--    Was referencing ci.caption, ci.hashtags, ci.idea_title
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
    COALESCE(cqs.custom_caption,  ci.tiktok_caption) AS caption,
    COALESCE(cqs.custom_hashtags, ci.hashtag)        AS hashtags,
    ci.content_title
FROM content_queue_schedules cqs
LEFT JOIN content_ideas ci ON ci.id = cqs.idea_id
WHERE cqs.status       = 'uploaded'
  AND cqs.auto_publish  = TRUE
  AND cqs.scheduled_at <= NOW();

COMMENT ON VIEW v_publish_queue IS 'Auto-publish cron view. Uses corrected content_ideas column names post-rename.';

-- ---------------------------------------------------------------------------
-- 3. Fix v_publish_notifications (UC009 notification panel)
--    Was referencing ci.idea_title
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_publish_notifications AS
SELECT
    psl.id                                AS log_id,
    psl.queue_schedule_id,
    psl.result,
    psl.http_status_code,
    psl.tiktok_post_id,
    psl.status_message,
    psl.retry_count,
    to_wib(psl.attempted_at)             AS attempted_at_wib,

    ci.content_title,
    cqs.status                           AS current_schedule_status,
    to_wib(cqs.scheduled_at)             AS scheduled_at_wib,

    CASE psl.result
        WHEN 'failed'   THEN 1
        WHEN 'retrying' THEN 2
        WHEN 'success'  THEN 3
    END                                  AS result_sort_order

FROM publish_status_logs psl
JOIN content_queue_schedules cqs ON cqs.id = psl.queue_schedule_id
LEFT JOIN content_ideas       ci  ON ci.id = cqs.idea_id
ORDER BY result_sort_order ASC, psl.attempted_at DESC;

COMMENT ON VIEW v_publish_notifications IS 'Notification panel view. Failures surfaced first. WIB timestamps. UC009.';

-- ---------------------------------------------------------------------------
-- 4. Fix trigger: copy idea metadata into the draft schedule on approve
--    Previously the draft was created with NULL custom_caption/custom_hashtags.
--    Now copies tiktok_caption → custom_caption and hashtag → custom_hashtags
--    so the content card shows metadata immediately without a JOIN fallback.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_auto_create_draft_schedule()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        INSERT INTO content_queue_schedules (
            idea_id,
            created_by,
            status,
            auto_publish,
            custom_caption,
            custom_hashtags
        ) VALUES (
            NEW.id,
            NEW.validated_by,
            'draft',
            TRUE,
            NEW.tiktok_caption,
            NEW.hashtag
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Recreate trigger (CREATE OR REPLACE FUNCTION is enough; trigger binding unchanged)
DROP TRIGGER IF EXISTS trg_idea_approved_create_draft ON content_ideas;
CREATE TRIGGER trg_idea_approved_create_draft
    AFTER UPDATE ON content_ideas
    FOR EACH ROW EXECUTE FUNCTION trigger_auto_create_draft_schedule();
