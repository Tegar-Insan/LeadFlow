-- =============================================================================
-- LEADFLOW — 021_add_content_idea_metadata_fields.sql
-- Adds the AI-generated metadata fields that ContentIdea.ts (Claude/Anthropic
-- generation) has held in memory since the model migration but never wrote to
-- the DB: category, estimated_engagement, best_time_to_post_wib. Without these
-- columns, listPendingIdeasForUser() falls back to hardcoded placeholder
-- values and the existing approveIdea() join (which already SELECTs these
-- column names from content_ideas) fails on a missing-column error.
-- Additive only — existing rows default to NULL.
-- SRS Refs: UC005 Generate Content Idea, UC006 Validate AI Content Ideas
-- =============================================================================

ALTER TABLE content_ideas
    ADD COLUMN IF NOT EXISTS category VARCHAR(30)
        CHECK (category IN (
            'BEHIND-THE-SCENES',
            'MENU-SHOWCASE',
            'PROMOTION',
            'TESTIMONIAL',
            'TRENDING'
        )),
    ADD COLUMN IF NOT EXISTS estimated_engagement VARCHAR(10)
        CHECK (estimated_engagement IN ('low', 'medium', 'high')),
    ADD COLUMN IF NOT EXISTS best_time_to_post_wib TIMESTAMPTZ;

COMMENT ON COLUMN content_ideas.category IS
    'AI-assigned content category. One of the 5 categories used by the ContentIdea.ts generation system prompt.';
COMMENT ON COLUMN content_ideas.estimated_engagement IS
    'AI-estimated engagement tier (low/medium/high) for this idea.';
COMMENT ON COLUMN content_ideas.best_time_to_post_wib IS
    'AI-recommended posting time in WIB peak windows (11:00-13:00 or 19:00-21:00), stored as a real timestamptz.';

CREATE INDEX IF NOT EXISTS idx_content_ideas_category ON content_ideas (category);
