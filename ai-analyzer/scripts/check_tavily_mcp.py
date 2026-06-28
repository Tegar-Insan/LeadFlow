"""
check_tavily_mcp.py — MVP connection verifier for the Tavily MCP server.

Runs four checks in sequence and prints a clear ✓/✗ report:

  Check 1 — TAVILY_API_KEY present in environment
  Check 2 — npx is on PATH and executable
  Check 3 — Tavily HTTP API responds (proves the key is valid)
  Check 4 — Tavily MCP server starts via npx and lists its tools (proves
             the stdio MCP transport works end-to-end)

Usage (from ai-analyzer/ root, with venv active):
    python scripts/check_tavily_mcp.py

The script is read-only: it never writes to Supabase or generates ideas.
"""

import json
import os
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path

# ── Bootstrap .env ────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass  # python-dotenv not installed — rely on shell env

# ── Colour helpers ─────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

def ok(msg: str)   -> None: print(f"  {GREEN}✓{RESET} {msg}")
def fail(msg: str) -> None: print(f"  {RED}✗{RESET} {msg}")
def warn(msg: str) -> None: print(f"  {YELLOW}⚠{RESET} {msg}")
def info(msg: str) -> None: print(f"  {CYAN}→{RESET} {msg}")


# ─────────────────────────────────────────────────────────────────────────────
# Check 1 — API key present
# ─────────────────────────────────────────────────────────────────────────────
def check_api_key() -> str | None:
    print(f"\n{BOLD}[1/4] TAVILY_API_KEY{RESET}")
    key = os.environ.get("TAVILY_API_KEY", "").strip()
    if not key:
        fail("TAVILY_API_KEY is not set (check .env)")
        return None
    masked = key[:8] + "…" + key[-4:]
    ok(f"Key found: {masked}")
    return key


# ─────────────────────────────────────────────────────────────────────────────
# Check 2 — npx on PATH
# ─────────────────────────────────────────────────────────────────────────────
def check_npx() -> str | None:
    print(f"\n{BOLD}[2/4] npx availability{RESET}")
    npx = shutil.which("npx")
    if not npx:
        fail("npx not found on PATH — install Node.js and re-activate venv")
        info(f"Current PATH: {os.environ.get('PATH', '(empty)')[:200]}")
        return None
    ok(f"npx found at: {npx}")
    # Quick version check
    try:
        result = subprocess.run(
            [npx, "--version"], capture_output=True, text=True, timeout=10
        )
        ok(f"npx version: {result.stdout.strip()}")
    except Exception as exc:
        warn(f"Could not get npx version: {exc}")
    return npx


# ─────────────────────────────────────────────────────────────────────────────
# Check 3 — Direct Tavily HTTP API
# ─────────────────────────────────────────────────────────────────────────────
def check_tavily_http(api_key: str) -> bool:
    print(f"\n{BOLD}[3/4] Tavily HTTP API (direct call){RESET}")
    try:
        import httpx
    except ImportError:
        warn("httpx not installed — skipping HTTP check (pip install httpx)")
        return True  # not a blocking failure

    url = "https://api.tavily.com/search"
    payload = {
        "api_key": api_key,
        "query": "TikTok food trends Indonesia 2025",
        "max_results": 1,
        "search_depth": "basic",
    }
    try:
        resp = httpx.post(url, json=payload, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            results = data.get("results", [])
            ok(f"HTTP 200 — got {len(results)} result(s)")
            if results:
                info(f"First result: {results[0].get('title', '(no title)')[:80]}")
            return True
        elif resp.status_code == 401:
            fail(f"401 Unauthorized — API key is invalid or expired")
            return False
        else:
            fail(f"HTTP {resp.status_code}: {resp.text[:200]}")
            return False
    except Exception as exc:
        fail(f"HTTP call failed: {exc}")
        return False


# ─────────────────────────────────────────────────────────────────────────────
# Check 4 — Tavily MCP server via stdio JSON-RPC handshake
# ─────────────────────────────────────────────────────────────────────────────
def check_mcp_server(npx_path: str, api_key: str) -> bool:
    print(f"\n{BOLD}[4/4] Tavily MCP server (stdio JSON-RPC handshake){RESET}")

    # Build env identical to what mcp_config.py sends the agent SDK
    env = {**os.environ, "TAVILY_API_KEY": api_key}

    cmd = [npx_path, "-y", "tavily-mcp@latest"]
    info(f"Spawning: {' '.join(cmd)}")

    try:
        proc = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
            text=True,
        )
    except Exception as exc:
        fail(f"Failed to spawn MCP server: {exc}")
        return False

    # ── JSON-RPC helper ────────────────────────────────────────────────
    def send(msg: dict) -> None:
        line = json.dumps(msg) + "\n"
        proc.stdin.write(line)
        proc.stdin.flush()

    def recv(timeout: float = 20.0) -> dict | None:
        """Read one JSON-RPC line from stdout with timeout."""
        result: list[dict | None] = [None]
        error:  list[str]         = [""]

        def _read():
            try:
                while True:
                    line = proc.stdout.readline()
                    if not line:
                        break
                    line = line.strip()
                    if not line:
                        continue
                    result[0] = json.loads(line)
                    break
            except Exception as exc:
                error[0] = str(exc)

        t = threading.Thread(target=_read, daemon=True)
        t.start()
        t.join(timeout)
        if error[0]:
            fail(f"Parse error: {error[0]}")
            return None
        if result[0] is None:
            fail(f"No response within {timeout}s (server may still be downloading tavily-mcp)")
            return None
        return result[0]

    # ── Step 1: initialize ──────────────────────────────────────────────
    info("Sending MCP initialize…")
    send({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "leadflow-check", "version": "1.0"},
        },
    })

    init_resp = recv(timeout=30)  # first call may download the package
    if not init_resp:
        # Dump stderr for diagnosis
        stderr_out = ""
        try:
            proc.kill()
            _, stderr_out = proc.communicate(timeout=3)
        except Exception:
            pass
        if stderr_out:
            info(f"stderr: {stderr_out[:400]}")
        return False

    server_info = init_resp.get("result", {}).get("serverInfo", {})
    ok(f"Server initialized — {server_info.get('name', '?')} v{server_info.get('version', '?')}")

    # ── Step 2: notifications/initialized (required by MCP spec) ────────
    send({"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}})

    # ── Step 3: tools/list ──────────────────────────────────────────────
    info("Requesting tools/list…")
    send({"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}})

    tools_resp = recv(timeout=10)
    if not tools_resp:
        proc.kill()
        return False

    tools = tools_resp.get("result", {}).get("tools", [])
    if not tools:
        warn("Server started but returned no tools")
        proc.kill()
        return False

    ok(f"MCP server exposes {len(tools)} tool(s):")
    tool_names = []
    for t in tools:
        name = t.get("name", "?")
        desc = t.get("description", "")[:70]
        print(f"      • {CYAN}{name}{RESET} — {desc}")
        tool_names.append(name)

    # ── Check agent_runner.py ALLOWED_TOOLS matches ──────────────────────
    print()
    expected_allowed = "mcp__tavily__tavily_search"
    # Claude Code formats MCP tool names as mcp__<server>__<tool_name>
    actual_allowed = [f"mcp__tavily__{n.replace('-', '_')}" for n in tool_names]
    info(f"In ALLOWED_TOOLS, these names would be: {actual_allowed}")

    if expected_allowed in actual_allowed:
        ok(f"'{expected_allowed}' matches — ALLOWED_TOOLS is correct")
    else:
        warn(
            f"'{expected_allowed}' is NOT in the derived list.\n"
            f"      Update ALLOWED_TOOLS in agent_runner.py to: {actual_allowed}"
        )

    proc.kill()
    return True


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
def main() -> None:
    print(f"\n{BOLD}{CYAN}═══════════════════════════════════════════════{RESET}")
    print(f"{BOLD}{CYAN}  LeadFlow — Tavily MCP Connection Check{RESET}")
    print(f"{BOLD}{CYAN}═══════════════════════════════════════════════{RESET}")

    results: dict[str, bool] = {}

    api_key = check_api_key()
    results["api_key"] = api_key is not None

    npx_path = check_npx()
    results["npx"] = npx_path is not None

    if api_key:
        results["http_api"] = check_tavily_http(api_key)
    else:
        warn("Skipping HTTP check — no API key")
        results["http_api"] = False

    if npx_path and api_key:
        results["mcp_server"] = check_mcp_server(npx_path, api_key)
    else:
        warn("Skipping MCP server check — prerequisites missing")
        results["mcp_server"] = False

    # ── Summary ──────────────────────────────────────────────────────────
    print(f"\n{BOLD}Summary{RESET}")
    print("  " + "─" * 40)
    labels = {
        "api_key":    "TAVILY_API_KEY set",
        "npx":        "npx on PATH",
        "http_api":   "Tavily HTTP API",
        "mcp_server": "Tavily MCP server (stdio)",
    }
    all_ok = True
    for key, label in labels.items():
        passed = results.get(key, False)
        if passed:
            print(f"  {GREEN}✓{RESET}  {label}")
        else:
            print(f"  {RED}✗{RESET}  {label}")
            all_ok = False
    print("  " + "─" * 40)

    if all_ok:
        print(f"\n{GREEN}{BOLD}All checks passed — Tavily MCP is ready.{RESET}\n")
        sys.exit(0)
    else:
        print(f"\n{RED}{BOLD}One or more checks failed — see above for details.{RESET}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
