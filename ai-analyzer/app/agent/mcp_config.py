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


def build_mcp_servers() -> dict:
    return {
        "tavily": {
            "type": "stdio",
            "command": "npx",
            "args": ["-y", "tavily-mcp"],
            "env": {"TAVILY_API_KEY": os.environ["TAVILY_API_KEY"]},
        },
    }
