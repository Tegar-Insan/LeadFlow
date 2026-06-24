-- =============================================================================
-- LEADFLOW — 024_create_agent_schedules.sql
-- Agentic Mode (PLAN.md). Staff preference config for the AI content agent —
-- run once, or recurring daily/weekly via Google Cloud Scheduler (later
-- slice). This migration only creates the table; the cron-trigger endpoint
-- and recurring-config CRUD routes are out of scope for this slice.
-- Depends: 001_Create_roles.sql, 002_Create_users.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_schedules (
    id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_preference TEXT        NOT NULL,
    hashtags           TEXT[]      NOT NULL DEFAULT '{}',
    preferred_times    TEXT[]      NOT NULL DEFAULT '{}',   -- ['08:00','19:00'] WIB
    image_style        TEXT,
    ideas_per_day       INTEGER     NOT NULL DEFAULT 3,
    run_time           VARCHAR(5)  NOT NULL,                -- 'HH:MM' WIB, when Cloud Scheduler fires
    frequency          VARCHAR(10) NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
    active             BOOLEAN     NOT NULL DEFAULT true,
    last_run_at        TIMESTAMPTZ,
    next_run_at        TIMESTAMPTZ,
    created_by         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE agent_schedules IS
    'Staff preference config for Agentic Mode. One row per configured cadence; agent_runs.schedule_id links a cron-triggered run back here.';

CREATE INDEX IF NOT EXISTS idx_agent_schedules_created_by ON agent_schedules (created_by);
CREATE INDEX IF NOT EXISTS idx_agent_schedules_active     ON agent_schedules (active);

DROP TRIGGER IF EXISTS trg_agent_schedules_updated_at ON agent_schedules;
CREATE TRIGGER trg_agent_schedules_updated_at
    BEFORE UPDATE ON agent_schedules
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — same staff/admin/owner pattern as content_queue_schedules (006).
-- Backend/ai-analyzer use the service-role key and bypass RLS for normal
-- operation; these policies are defensive, matching project convention.
-- ---------------------------------------------------------------------------
ALTER TABLE agent_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_agent_schedules_admin_all ON agent_schedules
    FOR ALL USING (get_caller_role() = 'admin');

CREATE POLICY rls_agent_schedules_staff_all ON agent_schedules
    FOR ALL USING (get_caller_role() = 'marketing_staff');

CREATE POLICY rls_agent_schedules_owner_read ON agent_schedules
    FOR SELECT USING (get_caller_user_id() = created_by);

-- ---------------------------------------------------------------------------
-- GRANTs (per lessons-learned: new tables must include GRANTs explicitly)
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_schedules TO authenticated;
