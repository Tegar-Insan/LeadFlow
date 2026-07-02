-- =============================================================================
-- LEADFLOW — 027_generalize_preview_image_url.sql
-- 026 added content_queue_schedules.preview_image_url scoped to Agentic Mode
-- drafts only. The chatbot AI-idea-approval flow (chatbotController.ts
-- approveSchedule) creates the exact same shape of row — idea_id NULL,
-- AI-generated poster image, no content_ideas row to join against — so it
-- reuses the same column instead of adding a near-duplicate one. This is a
-- comment-only change; the column and its type are untouched.
-- Depends: 026_add_agent_fields_to_content_queue_schedules.sql
-- =============================================================================

COMMENT ON COLUMN content_queue_schedules.preview_image_url IS
    'Public Supabase Storage URL for an AI-generated poster image on an idea-less schedule (agent_run_id set = Agentic Mode; agent_run_id NULL = chatbot-approved UC005 recommendation). NULL once real content_assets media is uploaded/preferred.';
