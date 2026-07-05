"""
test_agent_permissions.py
Covers the Agentic Mode permission gate (PLAN.md §2/7 — unattended run, no
human to approve tool calls, so `_can_use_tool` is the actual security
boundary): every tool the model tries must be on ALLOWED_TOOLS or it's
denied outright, regardless of how plausible-looking the tool name is.

Includes the two built-in SDK tools referenced in the Agent SDK docs
(https://code.claude.com/docs/en/agent-sdk/overview#built-in-tools) —
WebSearch and WebFetch — both intentionally allowlisted so the Searching
skill can look up a trend and, at most once per idea, read a promising
result's full page.
"""

import asyncio

from claude_agent_sdk.types import PermissionResultAllow, PermissionResultDeny

from app.agent.agent_runner import ALLOWED_TOOLS, _can_use_tool


def _call(tool_name: str, input_data: dict | None = None):
    return asyncio.run(_can_use_tool(tool_name, input_data or {}, None))


def test_every_allowlisted_tool_is_allowed():
    for tool_name in ALLOWED_TOOLS:
        result = _call(tool_name, {"some": "input"})
        assert isinstance(result, PermissionResultAllow), f"{tool_name} should be allowed"
        assert result.updated_input == {"some": "input"}


def test_web_search_is_allowed():
    result = _call("WebSearch", {"query": "trending TikTok food content Indonesia 2026"})
    assert isinstance(result, PermissionResultAllow)


def test_web_fetch_is_allowed():
    result = _call("WebFetch", {"url": "https://example.com/trend-report"})
    assert isinstance(result, PermissionResultAllow)


def test_tool_not_on_allowlist_is_denied():
    result = _call("Bash", {"command": "rm -rf /"})
    assert isinstance(result, PermissionResultDeny)
    assert "Bash" in result.message


def test_unknown_tool_name_is_denied():
    result = _call("mcp__unknown__thing")
    assert isinstance(result, PermissionResultDeny)
    assert "mcp__unknown__thing" in result.message
