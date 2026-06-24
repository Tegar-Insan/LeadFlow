"""
schemas.py — Pydantic request/response models for all LeadFlow AI routes.
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional, List, Any


# ── /analyze ──────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Interaction text to classify")
    channel_type: Literal["comment", "dm"] = Field(..., description="TikTok channel type")


class AnalyzeResponse(BaseModel):
    sentiment_type: Literal[
        "purchase_intent", "complaint", "general_inquiry", "compliment", "spam"
    ]
    priority_level: Literal["high", "medium", "low"]
    classified_by: str = "gemini-2.0-flash"


# ── /chatbot/message ──────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "model"]
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., min_length=1)


class ScheduleRecommendation(BaseModel):
    title: str
    caption: Optional[str] = None
    hashtags: List[str] = []
    scheduled_at: str          # ISO 8601 with +07:00
    day_label: Optional[str] = None
    time_wib: Optional[str] = None
    reasoning: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    type: Literal["text", "schedule_recommendation"] = "text"
    schedule: Optional[ScheduleRecommendation] = None
    model: str


# ── /image/generate ───────────────────────────────────────────────
# Triggered automatically right after Claude (Anthropic) produces a
# content idea — image generation is chained onto idea generation,
# not a separate manual step. GPT Image 2.0 is used for images only;
# all text/idea generation stays on Anthropic.
class IdeaImageContext(BaseModel):
    content_title: str = Field(..., min_length=1)
    tiktok_caption: str = Field(..., min_length=1)
    category: Optional[str] = None
    style_hint: Optional[str] = None


class ImageGenerationRequest(BaseModel):
    idea: IdeaImageContext


class ImageGenerationResponse(BaseModel):
    image_base64: str
    mime_type: str = "image/png"
    model: str
    prompt_used: str


# ── /agent/trigger, /agent/runs ───────────────────────────────────
# Agentic Mode (PLAN.md). triggered_by is accepted directly here so this
# endpoint can be exercised in isolation, bypassing the Node proxy, per the
# Phase 1 manual verification checklist — Node still owns auth/RBAC once the
# thin-proxy controller is wired in a later slice.
class AgentTriggerRequest(BaseModel):
    content_preference: str = Field(..., min_length=1)
    hashtags: List[str] = []
    preferred_times: List[str] = Field(..., min_length=1, description="['08:00','19:00'] WIB")
    image_style: Optional[str] = None
    ideas_per_day: int = Field(..., ge=1, le=10)
    date_from: str = Field(..., description="ISO date YYYY-MM-DD, WIB")
    date_to: str = Field(..., description="ISO date YYYY-MM-DD, WIB")
    triggered_by: str = Field(..., description="users.id of the staff member triggering this run")


class AgentTriggerResponse(BaseModel):
    run_id: str


class AgentRunResponse(BaseModel):
    id: str
    schedule_id: Optional[str] = None
    trigger_source: str
    status: str
    ideas_requested: int
    ideas_created: int
    current_step: Optional[str] = None
    error_message: Optional[str] = None
    triggered_by: Optional[str] = None
    created_at: str
    updated_at: str
