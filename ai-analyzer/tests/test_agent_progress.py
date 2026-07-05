"""
test_agent_progress.py
Covers the Agentic Mode progress-messaging slice (PLAN.md §11, migration 028):

- describe_tool_call: pure tool_name -> human label mapping, no I/O.
- _build_progress_hook: the PreToolUse hook that calls update_run_step for
  every tool call; must swallow write failures so a Supabase blip never
  aborts the agent loop.
- run_store.update_run_step: the actual Supabase write, with the client
  mocked out (no real network call).
"""

import asyncio

import app.agent.agent_runner as agent_runner
import app.agent.run_store as run_store
from app.agent.agent_runner import describe_tool_call


# ── describe_tool_call (pure, no I/O) ───────────────────────────────
def test_describe_tool_call_known_tools():
    assert "web" in describe_tool_call("WebSearch").lower()
    assert "web page" in describe_tool_call("WebFetch").lower()
    assert "image" in describe_tool_call("mcp__image__generate_image").lower()
    assert "Checking existing schedules" in describe_tool_call("mcp__supabase__check_existing_schedules")
    assert "Saving scheduled post" in describe_tool_call("mcp__supabase__insert_scheduled_content")
    assert "skill" in describe_tool_call("Skill").lower()


def test_describe_tool_call_falls_back_for_unknown_tool():
    label = describe_tool_call("mcp__unknown__thing")
    assert "mcp__unknown__thing" in label


# ── _build_progress_hook (PreToolUse hook factory) ──────────────────
def test_progress_hook_records_step_via_update_run_step(monkeypatch):
    calls = []
    monkeypatch.setattr(agent_runner, "update_run_step", lambda run_id, step: calls.append((run_id, step)))

    hook = agent_runner._build_progress_hook("run-abc")
    result = asyncio.run(
        hook({"tool_name": "WebSearch", "tool_input": {}}, "tool-use-1", None)
    )

    assert calls == [("run-abc", describe_tool_call("WebSearch"))]
    assert result == {"continue_": True}


def test_progress_hook_swallows_update_failures_and_still_continues(monkeypatch):
    def _boom(run_id, step):
        raise RuntimeError("supabase unreachable")

    monkeypatch.setattr(agent_runner, "update_run_step", _boom)

    hook = agent_runner._build_progress_hook("run-abc")
    result = asyncio.run(
        hook({"tool_name": "mcp__image__generate_image", "tool_input": {}}, "tool-use-2", None)
    )

    assert result == {"continue_": True}


def test_progress_hook_handles_missing_tool_name_key():
    hook = agent_runner._build_progress_hook("run-abc")
    # tool_name absent should not raise — falls through to the default label.
    result = asyncio.run(hook({}, "tool-use-3", None))
    assert result == {"continue_": True}


# ── run_store.update_run_step (Supabase write, client mocked) ───────
class _FakeTable:
    def __init__(self):
        self.last_update = None
        self.last_eq = None

    def update(self, payload):
        self.last_update = payload
        return self

    def eq(self, column, value):
        self.last_eq = (column, value)
        return self

    def execute(self):
        return None


class _FakeClient:
    def __init__(self):
        self.table_obj = _FakeTable()

    def table(self, name):
        assert name == "agent_runs"
        return self.table_obj


def test_update_run_step_writes_current_step_for_the_right_run(monkeypatch):
    fake_client = _FakeClient()
    monkeypatch.setattr(run_store, "get_supabase_admin", lambda: fake_client)

    run_store.update_run_step("run-123", "Searching the web for trends…")

    assert fake_client.table_obj.last_update == {"current_step": "Searching the web for trends…"}
    assert fake_client.table_obj.last_eq == ("id", "run-123")
