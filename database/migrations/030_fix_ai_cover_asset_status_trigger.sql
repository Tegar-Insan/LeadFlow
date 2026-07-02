-- =============================================================================
-- LEADFLOW — 030_fix_ai_cover_asset_status_trigger.sql
-- Bug: approveIdea (ContentIdea.ts) and chatbotController.ts's approveSchedule
-- now insert a real content_assets row for the AI-generated cover image
-- (see 029's comment). trg_asset_upload_advance_status (from UC008 manual
-- upload) fires on ANY content_assets insert and immediately advances the
-- parent schedule from draft/scheduled -> uploaded, with no way to tell a
-- real staff upload apart from the AI placeholder. This silently jumped
-- freshly-approved, still-unscheduled drafts to 'uploaded' with
-- scheduled_at still NULL — a state getDraftSchedules() (requires
-- status='draft') and getSchedulesByMonth() (requires scheduled_at in
-- range) both exclude, so the card vanished from ContentLibrarySidebar.
-- It also made such rows prematurely eligible for the auto-publish cron.
-- =============================================================================

ALTER TABLE content_assets
    ADD COLUMN IF NOT EXISTS is_ai_placeholder BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN content_assets.is_ai_placeholder IS
    'TRUE for the AI-generated cover auto-attached at UC005/UC006 idea approval (ContentIdea.ts approveIdea, chatbotController.ts approveSchedule). FALSE for real staff-uploaded media (UC008 mediaController.ts). Lets trg_asset_upload_advance_status skip prematurely advancing status for placeholder covers.';

CREATE OR REPLACE FUNCTION trigger_asset_upload_advance_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_ai_placeholder THEN
        RETURN NEW;
    END IF;

    UPDATE content_queue_schedules
    SET    status     = 'uploaded',
           updated_at = NOW()
    WHERE  id     = NEW.queue_schedule_id
      AND  status IN ('draft', 'scheduled');
    RETURN NEW;
END;
$$;

-- Backfill: retroactively tag existing AI-cover assets by their known
-- storage path convention (content-ideas/{ideaId}.png, chatbot-schedules/
-- {scheduleId}.png — see ContentIdea.ts / chatbotController.ts), and undo
-- the premature 'uploaded' status this trigger caused for schedules that
-- never actually received real media or a scheduled_at.
UPDATE content_assets
SET is_ai_placeholder = TRUE
WHERE storage_path LIKE 'content-ideas/%' OR storage_path LIKE 'chatbot-schedules/%';

UPDATE content_queue_schedules
SET status = 'draft', updated_at = NOW()
WHERE status = 'uploaded' AND scheduled_at IS NULL;
