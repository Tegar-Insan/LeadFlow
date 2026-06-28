"""
agent.py — Agentic Mode endpoints (PLAN.md section 11).

POST /agent/trigger          — manual trigger (full payload, no guard)
POST /agent/trigger-today    — daily idempotent trigger (reads agent_schedules,
                               checks agent_runs for today WIB, skips if already ran)
GET  /agent/runs/{id}        — poll run status
"""

import asyncio
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException

from app.agent.agent_runner import run_agent
from app.agent.run_store import create_run, get_run
from app.agent.schedule_store import can_run_agent_today
from app.models.schemas import (
    AgentTriggerRequest,
    AgentTriggerResponse,
    AgentTriggerTodayRequest,
    AgentTriggerTodayResponse,
    AgentRunResponse,
)
from app.utils.logger import logger

JAKARTA_TZ = timezone(timedelta(hours=7))

router = APIRouter(prefix="/agent")


@router.post("/trigger", response_model=AgentTriggerResponse)
async def trigger_agent(req: AgentTriggerRequest):
    run = create_run(
        trigger_source="manual",
        triggered_by=req.triggered_by,
        ideas_requested=req.ideas_per_day,
    )
    run_id = run["id"]

    prefs = {
        "content_preference": req.content_preference,
        "hashtags": req.hashtags,
        "preferred_times": req.preferred_times,
        "image_style": req.image_style,
        "ideas_per_day": req.ideas_per_day,
        "date_from": req.date_from,
        "date_to": req.date_to,
    }

    async def _run():
        try:
            await run_agent(run_id, prefs, req.triggered_by)
        except Exception as exc:
            logger.error(f"[agent.trigger] run {run_id} crashed: {exc}")

    asyncio.create_task(_run())

    return AgentTriggerResponse(run_id=run_id)


@router.post("/trigger-today", response_model=AgentTriggerTodayResponse)
async def trigger_today(req: AgentTriggerTodayRequest):
    """
    Idempotent daily trigger — mirrors POST /api/agent/trigger-today on the Node backend.
    Intended for GCP Cloud Scheduler (Phase 2) or any caller that knows a user_id but
    not the full content preferences (those are read from agent_schedules here).
    """
    can_run, schedule, reason = can_run_agent_today(req.triggered_by)

    if not can_run:
        logger.info(f"[agent.trigger-today] skipped for {req.triggered_by}: {reason}")
        return AgentTriggerTodayResponse(triggered=False, reason=reason)

    today_wib = datetime.now(JAKARTA_TZ).strftime("%Y-%m-%d")
    preferred_times = schedule.get("preferred_times") or ["19:00"]

    run = create_run(
        trigger_source="cron",
        triggered_by=req.triggered_by,
        ideas_requested=schedule.get("ideas_per_day", 3),
        schedule_id=schedule.get("id"),
    )
    run_id = run["id"]

    prefs = {
        "content_preference": schedule["content_preference"],
        "hashtags":           schedule.get("hashtags") or [],
        "preferred_times":    preferred_times,
        "image_style":        schedule.get("image_style"),
        "ideas_per_day":      schedule.get("ideas_per_day", 3),
        "date_from":          today_wib,
        "date_to":            today_wib,
    }

    async def _run():
        try:
            await run_agent(run_id, prefs, req.triggered_by)
        except Exception as exc:
            logger.error(f"[agent.trigger-today] run {run_id} crashed: {exc}")

    asyncio.create_task(_run())

    logger.info(f"[agent.trigger-today] started run {run_id} for {req.triggered_by}")
    return AgentTriggerTodayResponse(triggered=True, run_id=run_id)


@router.get("/runs/{run_id}", response_model=AgentRunResponse)
async def get_agent_run(run_id: str):
    run = get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Agent run not found")
    return AgentRunResponse(**run)
