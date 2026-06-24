"""
agent.py — Agentic Mode endpoints (PLAN.md section 11).

This Phase 1 slice covers only POST /agent/trigger and GET /agent/runs/{id}.
/agent/schedule CRUD and /agent/cron-trigger are out of scope for this slice
(no Cloud Scheduler / recurring-config work yet — see PLAN.md section 16).
"""

import asyncio

from fastapi import APIRouter, HTTPException

from app.agent.agent_runner import run_agent
from app.agent.run_store import create_run, get_run
from app.models.schemas import AgentTriggerRequest, AgentTriggerResponse, AgentRunResponse
from app.utils.logger import logger

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


@router.get("/runs/{run_id}", response_model=AgentRunResponse)
async def get_agent_run(run_id: str):
    run = get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Agent run not found")
    return AgentRunResponse(**run)
