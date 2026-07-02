"""
mcp_config.py — external MCP servers wired into the Agentic Mode agent.

Exactly one true external MCP server: Tavily, for the Trend Search skill.
Supabase is deliberately NOT an MCP server here — the official Supabase MCP
server is OAuth-login-based (built for interactive tools like Cursor/Claude
Desktop), not usable from an unattended Cloud Run job authenticated with a
service-role key. The agent's own Supabase reads/writes go through a direct
SDK-wrapped tool instead (see tools/supabase_tool.py), same as Image
Generation. See PLAN.md section 3 revision note for why this differs from
the original two-MCP-server framing.
"""

import os
import sys
import shutil

# Pinned to a known-stable version whose tool name is `tavily_search`.
# The composed MCP tool name the agent uses is `mcp__tavily__tavily_search`.
# Do not use @latest — a version bump that renames the tool silently breaks
# the ALLOWED_TOOLS allowlist and the TOOL_STEP_LABELS mapping in agent_runner.py.
_TAVILY_MCP_VERSION = "tavily-mcp@0.1.4"


def build_mcp_servers() -> dict:
    tavily_key = os.environ.get("TAVILY_API_KEY", "")
    if not tavily_key:
        raise RuntimeError(
            "TAVILY_API_KEY is not set. Agentic Mode web search will not work. "
            "Add TAVILY_API_KEY to ai-analyzer/.env"
        )

    # Inherit the full process environment so the subprocess can find npx/node
    # on PATH. Passing only TAVILY_API_KEY would strip PATH and the spawn fails.
    tavily_env = {**os.environ, "TAVILY_API_KEY": tavily_key}

    # On Windows, shutil.which("npx") resolves to npx.cmd — a batch file that
    # cannot be executed as a direct subprocess command by Node's spawn() without
    # shell:true. Route through cmd /c so Node can invoke it correctly.
    # Use shutil.which("cmd") to get the full path (C:\Windows\System32\cmd.exe)
    # rather than a bare "cmd" which may not resolve in all subprocess environments.
    # On Linux/macOS, use the resolved absolute path (or fall back to bare "npx"
    # if shutil.which returns None, letting the shell find it via PATH).
    if sys.platform == "win32":
        command = shutil.which("cmd") or "cmd.exe"
        args = ["/c", "npx", "-y", _TAVILY_MCP_VERSION]
    else:
        command = shutil.which("npx") or "npx"
        args = ["-y", _TAVILY_MCP_VERSION]

    return {
        "tavily": {
            "type": "stdio",
            "command": command,
            "args": args,
            "env": tavily_env,
        },
    }
