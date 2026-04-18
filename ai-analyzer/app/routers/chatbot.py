"""
chatbot.py — /chatbot/* routes
Anthropic Claude-powered marketing assistant for Krench Chicken.

POST /chatbot/message        — multi-turn conversation
POST /chatbot/analyze-tiktok — on-demand Bright Data + Claude analysis
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import ChatRequest, ChatResponse, TikTokAnalysisResponse
from app.services.anthropic_chatbot import chat, analyze_tiktok_data, clear_analysis_cache
from app.services.brightdata_service import fetch_tiktok_data, summarize_posts
from app.utils.logger import logger
import os

router = APIRouter(prefix="/chatbot")

# In-process TikTok context cache (shared across all requests)
_tiktok_context: str = ""
_context_loaded: bool = False


async def _get_tiktok_context() -> str:
    """Lazy-load TikTok context on first chat message."""
    global _tiktok_context, _context_loaded
    if _context_loaded:
        return _tiktok_context
    try:
        posts   = await fetch_tiktok_data()
        summary = summarize_posts(posts)
        _tiktok_context = await analyze_tiktok_data(summary)
        logger.info("[chatbot] TikTok context ready")
    except Exception as exc:
        logger.warning(f"[chatbot] Could not load TikTok context: {exc}")
        _tiktok_context = ""
    _context_loaded = True
    return _tiktok_context


@router.post("/message", response_model=ChatResponse)
async def chatbot_message(req: ChatRequest):
    """
    Multi-turn Claude conversation with TikTok intelligence context.
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
            model="stub",
        )

    tiktok_context = await _get_tiktok_context()

    # Convert Pydantic models to plain dicts for the service layer
    messages = [{"role": m.role, "content": m.content} for m in req.messages[-10:]]

    try:
        visible, schedule, model_id = await chat(messages, tiktok_context)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error(f"[chatbot] chat() failed: {exc}")
        raise HTTPException(status_code=500, detail="Gagal mendapatkan respons AI")

    from app.models.schemas import ScheduleRecommendation
    schedule_obj = ScheduleRecommendation(**schedule) if schedule else None

    return ChatResponse(
        reply=visible,
        type="schedule_recommendation" if schedule else "text",
        schedule=schedule_obj,
        model=model_id,
    )


@router.post("/analyze-tiktok", response_model=TikTokAnalysisResponse)
async def analyze_tiktok():
    """
    Trigger a fresh Bright Data fetch + Claude analysis.
    Clears the in-process cache so next /message call uses fresh context.
    """
    global _tiktok_context, _context_loaded

    clear_analysis_cache()
    _context_loaded = False

    posts   = await fetch_tiktok_data()
    summary = summarize_posts(posts)

    if not summary:
        return TikTokAnalysisResponse(
            analysis="No TikTok data available. Set BRIGHTDATA_DATASET_ID in .env.",
            post_count=0,
            model=os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"),
        )

    analysis = await analyze_tiktok_data(summary)
    _tiktok_context = analysis
    _context_loaded = True

    return TikTokAnalysisResponse(
        analysis=analysis,
        post_count=len(posts),
        model=os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"),
    )
