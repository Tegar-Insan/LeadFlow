-- =============================================================================
-- LEADFLOW — 005_create_content_ideas.sql
-- Increment : 2 — Content Generation
-- Contains  : content_ideas table + idea count trigger + view + RLS
-- SRS Ref   : UC005 Generate Content Idea, UC006 Validate AI Content Ideas
-- SDS Ref   : Section 5.4 — ContentIdea class
--             Section 5.5 — Entity: ContentIdea — Data Dict <ContentIdea>
--             Section 5.8 — SD005, SD006
--             Section 5.9 — Algorithm: generateContentIdea()
-- Depends   : 001_Create_roles.sql, 002_Create_users.sql, 004_create_prompts.sql
-- NOTE      : Approval trigger (→ auto-create draft schedule) is in
--             006_create_content_queue_schedules.sql to avoid circular deps
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: content_ideas
-- Stores GPT-4o generated ideas. Up to 3 per prompt (SDS UC006).
-- Status transitions:
--   pending_validation → approved  (triggers draft in calendar)
--   pending_validation → rejected  (never enters calendar)
-- SDS Entity: ContentIdea
-- Attributes: ideaId, promptId, ideaTitle, hook, caption, hashtags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_ideas (
    id                  UUID                        PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_id           UUID                        NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    created_by          UUID                        NOT NULL REFERENCES users(id) ON DELETE SET NULL,

    -- AI-generated content fields (SDS Section 5.4.2 — ContentIdea attributes)
    idea_title          VARCHAR(255)    NOT NULL,
    hook                TEXT,                           -- opening hook for TikTok first 3 sec
    caption             TEXT            NOT NULL,       -- full post caption
    hashtags            TEXT[],                         -- array e.g. {'#KrenchChicken','#BogorFood'}
    suggested_music     VARCHAR(255),                   -- music track suggestion
    estimated_duration  INT,                            -- suggested video length (seconds)

    -- Validation lifecycle (SDS UC006)
    status              content_idea_status_enum    NOT NULL DEFAULT 'pending_validation',
    rejected_reason     TEXT,                           -- required when status = 'rejected'
    validated_by        UUID            REFERENCES users(id) ON DELETE SET NULL,
    validated_at        TIMESTAMPTZ,

    -- AI generation metadata
    ai_model_used       VARCHAR(50)     NOT NULL DEFAULT 'gpt-4o',
    generation_tokens   INT,                            -- token usage for cost monitoring

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  content_ideas        IS 'GPT-4o generated ideas. Max 3 per prompt. Approval auto-creates calendar draft.';
COMMENT ON COLUMN content_ideas.status IS 'pending_validation → approved (triggers draft) OR rejected (no calendar entry).';
COMMENT ON COLUMN content_ideas.hook   IS 'Opening line to hook TikTok viewers in first 3 seconds of video.';
COMMENT ON COLUMN content_ideas.hashtags IS 'PostgreSQL text array. Stored as {''#KrenchChicken'',''#BogorFood'',...}.';

CREATE INDEX idx_content_ideas_prompt_id ON content_ideas (prompt_id);
CREATE INDEX idx_content_ideas_status    ON content_ideas (status);
CREATE INDEX idx_content_ideas_created   ON content_ideas (created_at DESC);

-- Auto-update updated_at
CREATE TRIGGER trg_content_ideas_updated_at
    BEFORE UPDATE ON content_ideas
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- TRIGGER: sync ideas_count on prompts table
-- Increments when idea inserted, decrements when deleted
-- Keeps prompt listing accurate without COUNT(*) queries
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_sync_prompt_ideas_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE prompts SET ideas_count = ideas_count + 1 WHERE id = NEW.prompt_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE prompts SET ideas_count = GREATEST(ideas_count - 1, 0) WHERE id = OLD.prompt_id;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_prompt_ideas_count_sync
    AFTER INSERT OR DELETE ON content_ideas
    FOR EACH ROW EXECUTE FUNCTION trigger_sync_prompt_ideas_count();

-- ---------------------------------------------------------------------------
-- VIEW: v_content_ideas_detail
-- Validation page — shows all ideas with parent prompt context
-- Used by: UC006 Validate AI Content Ideas — Marketing Staff
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_content_ideas_detail AS
SELECT
    ci.id                               AS idea_id,
    ci.idea_title,
    ci.hook,
    ci.caption,
    ci.hashtags,
    ci.suggested_music,
    ci.estimated_duration,
    ci.status,
    ci.rejected_reason,
    ci.ai_model_used,
    ci.generation_tokens,
    p.id                                AS prompt_id,
    p.prompt_text,
    p.target_audience,
    p.content_theme,
    u.email                             AS created_by_email,
    up.full_name                        AS created_by_name,
    vu.email                            AS validated_by_email,
    to_wib(ci.created_at)               AS created_at_wib,
    to_wib(ci.validated_at)             AS validated_at_wib
FROM content_ideas ci
JOIN  prompts       p  ON p.id       = ci.prompt_id
JOIN  users         u  ON u.id       = ci.created_by
LEFT JOIN user_profiles up ON up.user_id  = ci.created_by
LEFT JOIN users         vu ON vu.id  = ci.validated_by;

COMMENT ON VIEW v_content_ideas_detail IS 'Full idea detail for validation UI. Includes prompt context and validator info. WIB timestamps.';

-- ---------------------------------------------------------------------------
-- RLS: content_ideas
-- Marketing Staff: full CRUD (create + validate)
-- Business Owner: read only (monitoring)
-- Admin: full access
-- ---------------------------------------------------------------------------
ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_ideas_admin_all ON content_ideas
    FOR ALL USING (get_caller_role() = 'admin');

CREATE POLICY rls_ideas_staff_all ON content_ideas
    FOR ALL USING (get_caller_role() = 'marketing_staff');

CREATE POLICY rls_ideas_owner_read ON content_ideas
    FOR SELECT USING (get_caller_role() = 'business_owner');