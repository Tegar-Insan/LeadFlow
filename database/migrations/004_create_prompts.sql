-- =============================================================================
-- LEADFLOW — 004_create_prompts.sql
-- Increment : 2 — Content Generation
-- Contains  : prompts table + trigger + view + RLS
-- SRS Ref   : UC004 Input Prompt Idea, UC005 Generate Content Idea
-- SDS Ref   : Section 5.4 — Prompt class
--             Section 5.5 — Entity: Prompt — Data Dict <Prompt>
--             Section 5.8 — SD004 Input Prompt, SD005 Generate Content Idea
--             Section 5.9 — Algorithm: generateContentIdea()
-- Depends   : 001_Create_roles.sql, 002_Create_users.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TABLE: prompts
-- Marketing Staff submits a content brief here as input for GPT-4o.
-- A single prompt can generate multiple ideas (up to 3 per SDS UC006).
-- SDS Entity: Prompt
-- Attributes: promptId, userId, promptText
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prompts (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE SET NULL,

    -- Core prompt data (SDS SD004 — Input Prompt Data)
    prompt_text     TEXT        NOT NULL,           -- marketing brief from Marketing Staff
    target_audience VARCHAR(255),                   -- e.g. "young adults 18-30 in Bogor"
    content_theme   VARCHAR(150),                   -- e.g. "menu_showcase", "promotion"

    -- Cached count of ideas generated from this prompt
    -- Updated by trigger in 005_create_content_ideas.sql
    ideas_count     INT         NOT NULL DEFAULT 0,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  prompts             IS 'Marketing brief inputs submitted by Marketing Staff. Each prompt fed to OpenAI GPT-4o.';
COMMENT ON COLUMN prompts.prompt_text IS 'Full brief text sent to GPT-4o as user prompt. Stored for regeneration (UC005 AF1).';
COMMENT ON COLUMN prompts.ideas_count IS 'Cached count — synced by trigger in 005_create_content_ideas.sql on INSERT/DELETE.';

CREATE INDEX idx_prompts_user_id  ON prompts (user_id);
CREATE INDEX idx_prompts_created  ON prompts (created_at DESC);

-- Auto-update updated_at
CREATE TRIGGER trg_prompts_updated_at
    BEFORE UPDATE ON prompts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- VIEW: v_prompts_summary
-- Prompt listing page for Marketing Staff
-- Shows who created each prompt and how many ideas were generated
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_prompts_summary AS
SELECT
    p.id                            AS prompt_id,
    p.prompt_text,
    p.target_audience,
    p.content_theme,
    p.ideas_count,
    u.email                         AS created_by_email,
    up.full_name                    AS created_by_name,
    to_wib(p.created_at)            AS created_at_wib,
    to_wib(p.updated_at)            AS updated_at_wib
FROM prompts p
JOIN  users         u  ON u.id      = p.user_id
LEFT JOIN user_profiles up ON up.user_id = p.user_id;

COMMENT ON VIEW v_prompts_summary IS 'Prompt listing for Marketing Staff AI page. WIB timestamps.';

-- ---------------------------------------------------------------------------
-- RLS: prompts
-- Marketing Staff: CRUD on their own prompts
-- Admin: read all (for oversight)
-- Business Owner: no access (content creation is staff-only)
-- ---------------------------------------------------------------------------
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_prompts_admin_read ON prompts
    FOR SELECT USING (get_caller_role() = 'admin');

CREATE POLICY rls_prompts_staff_own ON prompts
    FOR ALL USING (
        get_caller_role() = 'marketing_staff'
        AND user_id = get_caller_user_id()
    );