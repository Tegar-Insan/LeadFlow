"""
chatbot.py — /chatbot/* routes
Anthropic Claude-powered marketing assistant for Krench Chicken.

POST /chatbot/message — multi-turn conversation
"""

import os

from fastapi import APIRouter, HTTPException
from app.models.schemas import ChatRequest, ChatResponse, ScheduleRecommendation
from app.services.anthropic_chatbot import chat
from app.utils.logger import logger

router = APIRouter(prefix="/chatbot")


@router.post("/message", response_model=ChatResponse)
async def chatbot_message(req: ChatRequest):
    """
    Multi-turn Claude conversation.
    Detects schedule recommendations and returns them as structured data.
    """
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages array is required")

    last = req.messages[-1]
    if last.role not in ("user",):
        raise HTTPException(status_code=400, detail="Last message must be from user")

    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        return ChatResponse(
            reply="AI Assistant belum dikonfigurasi. Silakan hubungi admin untuk mengatur ANTHROPIC_API_KEY.",
            type="text",
            schedule=None,
            model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6"),
        )

    messages = [{"role": m.role, "content": m.content} for m in req.messages[-10:]]

    try:
        visible, schedule, model_id = await chat(messages)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error(f"[chatbot] chat() failed: {exc}")
        raise HTTPException(status_code=500, detail="Gagal mendapatkan respons AI")

    schedule_obj = ScheduleRecommendation(**schedule) if schedule else None

    return ChatResponse(
        reply=visible,
        type="schedule_recommendation" if schedule else "text",
        schedule=schedule_obj,
        model=model_id,
    )
