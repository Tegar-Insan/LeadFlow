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


# ── /chatbot/analyze-tiktok ───────────────────────────────────────
class TikTokAnalysisResponse(BaseModel):
    analysis: str
    post_count: int
    model: str
