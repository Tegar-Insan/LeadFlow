"""
classifier.py
Classifies TikTok interactions (comments/DMs) using Anthropic Claude.
Returns: sentiment_type + priority_level (UC011)
"""

import json

from app.utils.anthropic_client import get_client, get_model_id
from app.utils.logger import logger

_SYSTEM = """You are a TikTok interaction classifier for Krench Chicken, an Indonesian fried-chicken brand.
Classify the given text into exactly one sentiment_type and one priority_level.

sentiment_type options:
- purchase_intent   : user wants to buy / asks about ordering
- complaint         : negative experience, dissatisfaction
- general_inquiry   : question about menu, location, hours
- compliment        : positive feedback, praise
- spam              : irrelevant, promotional, bot-like

priority_level:
- high   : needs immediate response (complaint, purchase_intent)
- medium : should respond within a few hours (general_inquiry, compliment)
- low    : low urgency (spam, generic comments)

Respond ONLY with valid JSON: {"sentiment_type": "...", "priority_level": "..."}
No explanation, no markdown, no extra text."""


async def classify(text: str, channel_type: str) -> dict:
    """
    Classify a single interaction text.
    Returns { sentiment_type, priority_level, classified_by }
    """
    model_id = get_model_id()

    try:
        client = get_client()
    except ValueError as exc:
        logger.error(f"[classifier] API key error: {exc}")
        return {
            "sentiment_type": "general_inquiry",
            "priority_level": "medium",
            "classified_by":  "fallback",
        }

    prompt = f'Channel: {channel_type}\nText: "{text}"'

    try:
        response = await client.messages.create(
            model=model_id,
            max_tokens=100,
            system=_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()

        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        data = json.loads(raw)

        valid_sentiments = {"purchase_intent", "complaint", "general_inquiry", "compliment", "spam"}
        valid_priorities = {"high", "medium", "low"}

        sentiment = data.get("sentiment_type", "general_inquiry")
        priority  = data.get("priority_level", "medium")

        if sentiment not in valid_sentiments:
            sentiment = "general_inquiry"
        if priority not in valid_priorities:
            priority = "medium"

        return {
            "sentiment_type": sentiment,
            "priority_level": priority,
            "classified_by":  model_id,
        }

    except Exception as exc:
        logger.error(f"[classifier] Failed: {exc}")
        return {
            "sentiment_type": "general_inquiry",
            "priority_level": "medium",
            "classified_by":  "fallback",
        }
