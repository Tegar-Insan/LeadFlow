-- =============================================================================
-- LEADFLOW — 025_create_agent_runs.sql
-- Agentic Mode (PLAN.md). One row per agent execution (manual trigger or,
-- later, Cloud Scheduler cron) — tracks status and idea counts for the
-- run, independent of the individual content_queue_schedules rows it creates.
-- Depends: 001_Create_roles.sql, 002_Create_users.sql, 024_create_agent_schedules.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_runs (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id     UUID        REFERENCES agent_schedules(id) ON DELETE SET NULL,
    trigger_source  VARCHAR(10) NOT NULL CHECK (trigger_source IN ('manual', 'cron')),
    status          VARCHAR(10) NOT NULL DEFAULT 'running'
                        CHECK (status IN ('running', 'success', 'partial', 'failed')),
    ideas_requested INTEGER     NOT NULL DEFAULT 0,
    ideas_created   INTEGER     NOT NULL DEFAULT 0,
    error_message   TEXT,
    triggered_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE agent_runs IS
    'One row per Agentic Mode execution. content_queue_schedules.agent_run_id (026) links the drafts a run produced back here.';

CREATE INDEX IF NOT EXISTS idx_agent_runs_status       ON agent_runs (status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_triggered_by ON agent_runs (triggered_by);
CREATE INDEX IF NOT EXISTS idx_agent_runs_schedule_id  ON agent_runs (schedule_id);

DROP TRIGGER IF EXISTS trg_agent_runs_updated_at ON agent_runs;
CREATE TRIGGER trg_agent_runs_updated_at
    BEFORE UPDATE ON agent_runs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — same staff/admin/owner pattern as agent_schedules (024).
-- ---------------------------------------------------------------------------
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_agent_runs_admin_all ON agent_runs
    FOR ALL USING (get_caller_role() = 'admin');

CREATE POLICY rls_agent_runs_staff_all ON agent_runs
    FOR ALL USING (get_caller_role() = 'marketing_staff');

CREATE POLICY rls_agent_runs_owner_read ON agent_runs
    FOR SELECT USING (get_caller_user_id() = triggered_by);

-- ---------------------------------------------------------------------------
-- GRANTs (per lessons-learned: new tables must include GRANTs explicitly)
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON agent_runs TO authenticated;
