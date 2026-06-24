-- =============================================================================
-- LEADFLOW — 026_add_agent_fields_to_content_queue_schedules.sql
-- Agentic Mode (PLAN.md). Lets a content_queue_schedules row trace back to
-- the agent_runs row that created it, and carries the agent-generated
-- poster image URL. idea_id stays NULL for agent-created drafts (same as
-- any other manually-created post — see 006's own comment on that column);
-- title/caption/hashtags reuse the existing custom_caption/custom_hashtags
-- columns, matching ContentQueueSchedule.ts's existing idea-less convention.
-- Depends: 006_create_content_queue_Schedule.sql, 025_create_agent_runs.sql
-- =============================================================================

ALTER TABLE content_queue_schedules
    ADD COLUMN IF NOT EXISTS agent_run_id       UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS preview_image_url  TEXT;

CREATE INDEX IF NOT EXISTS idx_cqs_agent_run_id ON content_queue_schedules (agent_run_id);

COMMENT ON COLUMN content_queue_schedules.agent_run_id IS
    'Set only for drafts created by Agentic Mode. NULL for manual/UC005-UC006 posts.';
COMMENT ON COLUMN content_queue_schedules.preview_image_url IS
    'Public Supabase Storage URL for the agent-generated poster image (leadflow-media bucket, agentic-mode/ prefix).';
