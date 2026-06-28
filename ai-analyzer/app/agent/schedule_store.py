"""
schedule_store.py — Python mirror of backend/src/models/AgentSchedule.ts.

Reads agent_schedules and agent_runs from Supabase to enforce the
"once per calendar day in WIB" idempotency guard for /agent/trigger-today.
All timestamp comparisons use WIB (Asia/Jakarta, UTC+7).
"""

from datetime import datetime, timezone, timedelta
from typing import Optional

from app.utils.supabase_client import get_supabase_admin

JAKARTA_TZ = timezone(timedelta(hours=7))


def _today_wib_utc_range() -> tuple[str, str]:
    """Returns (start_utc_iso, end_utc_iso) for today's calendar day in WIB."""
    now_wib = datetime.now(JAKARTA_TZ)
    start_wib = now_wib.replace(hour=0, minute=0, second=0, microsecond=0)
    end_wib   = now_wib.replace(hour=23, minute=59, second=59, microsecond=999999)
    return (
        start_wib.astimezone(timezone.utc).isoformat(),
        end_wib.astimezone(timezone.utc).isoformat(),
    )


def get_active_schedule_for_user(user_id: str) -> Optional[dict]:
    """Returns the most-recent active agent_schedules row for this user, or None."""
    client = get_supabase_admin()
    resp = (
        client.table("agent_schedules")
        .select(
            "id, content_preference, hashtags, preferred_times, "
            "image_style, ideas_per_day, run_time, created_by"
        )
        .eq("created_by", user_id)
        .eq("active", True)
        .order("created_at", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
    )
    return resp.data if resp and resp.data else None


def has_run_today(user_id: str) -> bool:
    """True if agent_runs already has a running/success/partial row for today (WIB)."""
    client = get_supabase_admin()
    start_utc, end_utc = _today_wib_utc_range()
    resp = (
        client.table("agent_runs")
        .select("id")
        .eq("triggered_by", user_id)
        .in_("status", ["running", "success", "partial"])
        .gte("created_at", start_utc)
        .lte("created_at", end_utc)
        .limit(1)
        .maybe_single()
        .execute()
    )
    return bool(resp and resp.data)


def can_run_agent_today(user_id: str) -> tuple[bool, Optional[dict], Optional[str]]:
    """
    Returns (can_run, schedule_row, reason).
    reason is None when can_run is True.
    Mirrors AgentSchedule.canUserRunAgentToday() in TypeScript.
    """
    schedule = get_active_schedule_for_user(user_id)
    if not schedule:
        return False, None, "no_active_schedule"

    if has_run_today(user_id):
        return False, None, "already_ran_today"

    return True, schedule, None
