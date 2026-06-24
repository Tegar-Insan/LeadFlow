-- =============================================================================
-- LEADFLOW — 028_add_current_step_to_agent_runs.sql
-- Agentic Mode progress messaging. Adds a single nullable free-text column
-- the agent updates as it moves through tool calls (Tavily search, image
-- generation, Supabase reads/writes) so GET /api/agent/runs/:id — already
-- polled by AgentRunningPanel.tsx — can surface "what is it doing right
-- now" without a new endpoint or websocket relay.
-- Depends: 025_create_agent_runs.sql
-- =============================================================================

ALTER TABLE agent_runs
    ADD COLUMN IF NOT EXISTS current_step TEXT;

COMMENT ON COLUMN agent_runs.current_step IS
    'Human-readable label for the tool call the agent is currently executing (e.g. "Searching trends via Tavily..."). Set by run_store.update_run_step, cleared implicitly once the run finalizes.';
