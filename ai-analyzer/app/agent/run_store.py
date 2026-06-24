"""
run_store.py — FastAPI layer's own agent_runs bookkeeping.

Plain supabase-py admin client, same role as `supabaseAdmin` in the Node
backend. Distinct from the agent's own in-loop Supabase tool
(tools/supabase_tool.py) — that one is part of the Claude tool-use loop and
writes to content_queue_schedules; this one is router-side and only ever
touches agent_runs. See PLAN.md section 11.
"""

from typing import Optional

from app.utils.supabase_client import get_supabase_admin

TABLE = "agent_runs"


def create_run(
    trigger_source: str,
    triggered_by: Optional[str],
    ideas_requested: int,
    schedule_id: Optional[str] = None,
) -> dict:
    client = get_supabase_admin()
    payload = {
        "schedule_id": schedule_id,
        "trigger_source": trigger_source,
        "status": "running",
        "ideas_requested": ideas_requested,
        "ideas_created": 0,
        "triggered_by": triggered_by,
    }
    resp = client.table(TABLE).insert(payload).execute()
    return resp.data[0]


def get_run(run_id: str) -> Optional[dict]:
    client = get_supabase_admin()
    resp = client.table(TABLE).select("*").eq("id", run_id).maybe_single().execute()
    return resp.data if resp else None


def update_run_progress(run_id: str, ideas_created: int) -> None:
    client = get_supabase_admin()
    client.table(TABLE).update({"ideas_created": ideas_created}).eq("id", run_id).execute()


def update_run_step(run_id: str, current_step: str) -> None:
    """Best-effort: called from the PreToolUse hook on every tool call, so a
    transient write failure here must never interrupt the agent loop itself."""
    client = get_supabase_admin()
    client.table(TABLE).update({"current_step": current_step}).eq("id", run_id).execute()


def finalize_run(run_id: str, ideas_created: int, ideas_requested: int, error_message: Optional[str] = None) -> None:
    if error_message:
        status = "failed"
    elif ideas_created >= ideas_requested:
        status = "success"
    elif ideas_created > 0:
        status = "partial"
    else:
        status = "failed"

    client = get_supabase_admin()
    client.table(TABLE).update(
        {
            "status": status,
            "ideas_created": ideas_created,
            "error_message": error_message,
        }
    ).eq("id", run_id).execute()
