-- =============================================================================
-- LEADFLOW — 027_extend_notifications_type_for_agent.sql
-- Agentic Mode (PLAN.md). Reserves two notification types for a future
-- Node-side hookup (agent run completion/failure) — not wired from Python
-- in this slice; Node integration is a separate follow-up (see PLAN.md
-- section 12). Landing the CHECK constraint now avoids a second migration
-- later just to extend it.
-- Depends: 023_create_notifications.sql
-- =============================================================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'publish_success',
    'publish_failed',
    'comment_added',
    'tiktok_disconnected',
    'idea_approved',
    'idea_rejected',
    'agent_run_completed',
    'agent_run_failed'
));
