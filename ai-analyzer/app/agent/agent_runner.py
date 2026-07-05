"""
agent_runner.py — the Agentic Mode agent loop (Phase 1, PLAN.md sections 2/7/11).

Runs a ClaudeSDKClient session per agent_runs row: one query per idea, using
the Searching/Copywriting/Schedule skills (loaded from skills_agent/ as a
local Claude Code plugin — see SKILLS_AGENT_DIR below, not the default
.claude/skills/ project-discovery path) plus three tools: the SDK's built-in
WebSearch tool, and two direct SDK tools (image generation, Supabase
read/write).

This is an unattended backend job — no human to approve tool calls. Per the
project decision (see PLAN.md and session notes), permission_mode stays
"default" with an explicit can_use_tool callback that auto-approves a fixed
allowlist and denies everything else, rather than permission_mode=
"bypassPermissions" (which would approve every tool, including ones we never
intended to grant). Python's can_use_tool additionally requires streaming
mode plus a PreToolUse hook that returns {"continue_": True} — without that
hook the SDK closes the stream before the permission callback can fire.
"""

import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    HookMatcher,
)
from claude_agent_sdk.types import PermissionResultAllow, PermissionResultDeny

from app.agent.tools.image_tool import build_image_tool_server
from app.agent.tools.supabase_tool import build_supabase_tool_server
from app.agent.run_store import update_run_progress, update_run_step, finalize_run
from app.utils.logger import logger

AI_ANALYZER_DIR = Path(__file__).resolve().parent.parent.parent
SKILLS_AGENT_DIR = AI_ANALYZER_DIR / "skills_agent"

JAKARTA_TZ = timezone(timedelta(hours=7))


def _now_wib() -> datetime:
    """Separated from _build_system_prompt so tests can monkeypatch a fixed
    'now' instead of depending on wall-clock time (see test_agent_scheduling_window.py)."""
    return datetime.now(JAKARTA_TZ)

ALLOWED_TOOLS = [
    "Skill",
    "WebSearch",
    "WebFetch",
    "mcp__image__generate_image",
    "mcp__supabase__check_existing_schedules",
    "mcp__supabase__insert_scheduled_content",
]

# Human-readable progress labels shown in AgentRunningPanel.tsx via
# agent_runs.current_step (028). Keyed by the exact tool name the SDK
# reports in a PreToolUse hook's tool_name field.
TOOL_STEP_LABELS = {
    "Skill": "Using a content-planning skill…",
    "WebSearch": "Searching the web for trends…",
    "WebFetch": "Reading a web page for more detail…",
    "mcp__image__generate_image": "Generating an image…",
    "mcp__supabase__check_existing_schedules": "Checking existing schedules in Supabase…",
    "mcp__supabase__insert_scheduled_content": "Saving scheduled post to Supabase…",
}


def describe_tool_call(tool_name: str) -> str:
    """Pure mapping, no I/O — kept separate from the hook below so it's
    trivially unit-testable without mocking the SDK or Supabase."""
    return TOOL_STEP_LABELS.get(tool_name, f"Running {tool_name}…")


async def _can_use_tool(tool_name: str, input_data: dict, context):
    if tool_name in ALLOWED_TOOLS:
        return PermissionResultAllow(updated_input=input_data)
    return PermissionResultDeny(message=f"Tool '{tool_name}' is not on this agent's allowlist")


async def _keep_stream_open_hook(input_data, tool_use_id, context):
    # Required workaround per the SDK docs: without a PreToolUse hook,
    # the stream closes before can_use_tool can be invoked.
    return {"continue_": True}


def _build_progress_hook(run_id: str):
    """PreToolUse fires for every tool call regardless of allow/deny, which
    is why it's used for progress reporting rather than can_use_tool (which
    only fires on "ask" decisions — see types.py's hooks docstring). A
    failed status write must never abort the agent loop, so errors here are
    logged and swallowed."""

    async def _progress_hook(input_data, tool_use_id, context):
        tool_name = input_data.get("tool_name", "")
        try:
            update_run_step(run_id, describe_tool_call(tool_name))
        except Exception as exc:
            logger.warning(f"[agent_runner] failed to record progress step for run {run_id}: {exc}")
        return {"continue_": True}

    return _progress_hook


def _build_system_prompt(prefs: dict) -> str:
    # The model has no ground truth for "today" on its own — without this it
    # was picking scheduled_at as "today at the current run time" instead of
    # properly planning ahead (see test_agent_scheduling_window.py). Compute
    # the real WIB clock here and shift the requested range so it never
    # starts today or earlier, even when trigger-today pins date_from==date_to
    # to today (see app/routers/agent.py's /trigger-today).
    now_wib = _now_wib()
    tomorrow_str = (now_wib + timedelta(days=1)).strftime("%Y-%m-%d")
    current_time_str = now_wib.strftime("%Y-%m-%d %H:%M")

    effective_date_from = max(prefs["date_from"], tomorrow_str)
    effective_date_to = max(prefs["date_to"], effective_date_from)

    return (
        "You are the Agentic Mode content planner for Krench Chicken, a fried "
        "chicken restaurant in Bogor, Indonesia, on TikTok.\n"
        f"Staff content preference: {prefs['content_preference']}\n"
        f"Staff hashtags to append: {', '.join(prefs.get('hashtags', []))}\n"
        f"Preferred posting times (WIB): {', '.join(prefs.get('preferred_times', []))}\n"
        f"Current date/time (WIB): {current_time_str}\n"
        f"Requested date range (WIB): {prefs['date_from']} to {prefs['date_to']}\n"
        f"Scheduling window to actually use (WIB): {effective_date_from} to {effective_date_to} "
        "— never schedule anything for today or earlier; this window has already "
        "been shifted forward to start no earlier than tomorrow so posts are "
        "properly planned ahead instead of posted immediately.\n"
        + (f"Image style preference: {prefs['image_style']}\n" if prefs.get("image_style") else "")
        + "For every idea: use the searching skill first, then the copywriting "
        "skill to write it, then call generate_image, then use the schedule "
        "skill (calling check_existing_schedules first) to pick a WIB slot within "
        "the scheduling window above, then call insert_scheduled_content exactly "
        "once to place it. One idea per turn."
    )


def _idea_instruction(index: int, total: int) -> str:
    return f"Produce content idea {index + 1} of {total} now, following the system prompt's steps in order."


def _build_options(prefs: dict, run_id: str, created_by: str) -> ClaudeAgentOptions:
    mcp_servers = {
        "image": build_image_tool_server(),
        "supabase": build_supabase_tool_server(run_id=run_id, created_by=created_by),
    }
    return ClaudeAgentOptions(
        model=os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6"),
        cwd=str(AI_ANALYZER_DIR),
        # No filesystem Skill discovery — skills load only from the explicit
        # plugin below. setting_sources=[] avoids pulling in any host-level
        # ~/.claude or project .claude/settings.json (multi-tenant isolation
        # per the SDK hosting guide).
        setting_sources=[],
        plugins=[{"type": "local", "path": str(SKILLS_AGENT_DIR)}],
        # setting_sources=[] alone does NOT hide Claude Code's own built-in
        # skills (code-review, init, security-review, etc. — confirmed via a
        # throwaway smoke test) — only the explicit `skills` allowlist filters
        # what's actually active for the model, down to just these three.
        skills=["skills_agent:copywriting", "skills_agent:schedule", "skills_agent:searching"],
        mcp_servers=mcp_servers,
        allowed_tools=ALLOWED_TOOLS,
        permission_mode="default",
        can_use_tool=_can_use_tool,
        hooks={
            "PreToolUse": [
                HookMatcher(matcher=None, hooks=[_keep_stream_open_hook, _build_progress_hook(run_id)]),
            ]
        },
        system_prompt=_build_system_prompt(prefs),
        max_turns=20,
    )


async def run_agent(run_id: str, prefs: dict, created_by: str) -> None:
    ideas_per_day = prefs["ideas_per_day"]
    options = _build_options(prefs, run_id, created_by)

    created = 0
    error_message: Optional[str] = None

    try:
        async with ClaudeSDKClient(options=options) as client:
            for i in range(ideas_per_day):
                try:
                    await client.query(_idea_instruction(i, ideas_per_day))
                    async for _ in client.receive_response():
                        pass
                    created += 1
                    update_run_progress(run_id, created)
                except Exception as exc:
                    # One failed idea must not abort the run (NFR-002).
                    logger.warning(f"[agent_runner] idea {i + 1}/{ideas_per_day} failed: {exc}")
                    continue
    except Exception as exc:
        logger.error(f"[agent_runner] run {run_id} failed to start/complete: {exc}")
        error_message = str(exc)

    finalize_run(run_id, created, ideas_per_day, error_message=error_message if created == 0 else None)
