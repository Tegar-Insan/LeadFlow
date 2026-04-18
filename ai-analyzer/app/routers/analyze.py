"""
analyze.py — POST /analyze
Classifies TikTok interactions for UC011.
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.classifier import classify
from app.utils.logger import logger

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    """
    Classify a TikTok comment or DM.
    Body: { text, channel_type: 'comment'|'dm' }
    Returns: { sentiment_type, priority_level, classified_by }
    """
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")

    logger.info(f"[analyze] channel={req.channel_type} len={len(req.text)}")

    result = await classify(req.text, req.channel_type)

    return AnalyzeResponse(**result)
