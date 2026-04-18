"""
anthropic_chatbot.py
Anthropic Claude-powered chatbot service for Krench Chicken TikTok marketing.

Schedule recommendation protocol:
  When Claude proposes a post slot it appends:
    %%SCHEDULE%%
    { ...json... }
    %%END%%
  This module strips that block and returns it as a structured object.
"""

import re
import json
from typing import List, Optional, Tuple, Dict, Any

from app.utils.anthropic_client import get_client, get_model_id
from app.utils.logger import logger


# ── System prompt ─────────────────────────────────────────────────
_BASE_SYSTEM = """You are an expert AI marketing assistant for Krench Chicken — a crispy fried-chicken brand in Bogor, West Java, Indonesia. You help the marketing team manage their TikTok content strategy through the LeadFlow platform.

Personality: helpful, concise, creative, data-driven. Always respond in the same language the user writes in (Bahasa Indonesia or English).

Specialties:
- TikTok content strategy for Indonesian food & beverage brands
- Viral content formats, caption writing, hashtag selection
- Optimal posting schedules for Indonesian audiences (WIB / GMT+7)
- Interpreting real TikTok engagement data to drive strategy
- Creating actionable content calendars

KEY SCHEDULING FACTS:
- Best posting times WIB: 07:00–09:00, 12:00–14:00, 19:00–22:00
- Peak engagement days: Tuesday, Thursday, Saturday, Sunday
- Growth minimum: 3–5 posts per week
- Best video length for food content: 21–34 seconds

SCHEDULE RECOMMENDATION PROTOCOL:
When the user asks for a specific schedule recommendation AND you have enough info to propose a concrete time slot, append this sentinel block at the very END of your response (after all human-readable text). Do NOT include it unless making a concrete recommendation:

%%SCHEDULE%%
{"title":"<short post title>","caption":"<TikTok caption 1-2 sentences with emoji>","hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5"],"scheduled_at":"<ISO 8601 in Asia/Jakarta e.g. 2026-05-10T20:00:00+07:00>","day_label":"<e.g. Sabtu, 10 Mei 2026>","time_wib":"<e.g. 20:00 WIB>","reasoning":"<max 20 words why this slot>"}
%%END%%

Rules: scheduled_at must be FUTURE (after today). Exactly 5 hashtags. No text after %%END%%."""

_SCHEDULE_RE = re.compile(r"%%SCHEDULE%%\s*(.*?)%%END%%", re.DOTALL)


# ── Schedule sentinel parser ──────────────────────────────────────
def _parse_schedule(raw: str) -> Tuple[str, Optional[Dict]]:
    """Strip %%SCHEDULE%%...%%END%% block, return (visible_text, schedule_dict|None)."""
    match = _SCHEDULE_RE.search(raw)
    if not match:
        return raw.strip(), None

    try:
        schedule = json.loads(match.group(1).strip())
        visible  = _SCHEDULE_RE.sub("", raw).strip()
        return visible, schedule
    except json.JSONDecodeError:
        return _SCHEDULE_RE.sub("", raw).strip(), None


# ── Convert message history to Anthropic format ───────────────────
def _to_anthropic_messages(messages: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """
    Convert [{role, content}] → Anthropic messages format.
    - Maps 'model' → 'assistant'
    - Ensures strict user/assistant alternation (drops consecutive same-role msgs)
    - Anthropic requires messages to start with 'user'
    """
    result = []
    for m in messages:
        role = "assistant" if m["role"] in ("assistant", "model") else "user"
        if result and result[-1]["role"] == role:
            result[-1]["content"] = m["content"]
            continue
        result.append({"role": role, "content": m["content"]})

    if result and result[0]["role"] == "assistant":
        result.pop(0)

    return result


# ── Analyze TikTok data ───────────────────────────────────────────
_analysis_cache: Optional[str] = None


async def analyze_tiktok_data(posts_summary: str) -> str:
    """
    Send scraped TikTok posts to Claude and return a concise marketing insight.
    Cached for the process lifetime.
    """
    global _analysis_cache
    if _analysis_cache is not None:
        return _analysis_cache
    if not posts_summary:
        return ""

    prompt = f"""You are analyzing Indonesian TikTok posts about food and beverages.

Posts:
{posts_summary}

Write a CONCISE marketing intelligence summary (max 300 words) covering:
1. Top 5 highest-engagement content themes
2. Most-used hashtags and their engagement lift
3. Best-performing posting patterns (days/times if detectable)
4. Content formats that get the most shares
5. Audience sentiment / tone that resonates

Be specific and data-driven. English only."""

    try:
        client   = get_client()
        model_id = get_model_id()
        response = await client.messages.create(
            model=model_id,
            max_tokens=600,
            system="You are a data analyst summarizing TikTok marketing data.",
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text
        _analysis_cache = text
        logger.info("[anthropic] TikTok analysis cached")
        return text
    except Exception as exc:
        logger.error(f"[anthropic] analyze_tiktok_data failed: {exc}")
        return ""


def clear_analysis_cache():
    global _analysis_cache
    _analysis_cache = None


# ── Main chat function ────────────────────────────────────────────
async def chat(
    messages: List[Dict[str, Any]],
    tiktok_context: str = "",
) -> Tuple[str, Optional[Dict], str]:
    """
    Multi-turn Claude conversation with optional TikTok context.

    Returns: (visible_text, schedule_dict|None, model_id)
    """
    system = (
        f"{_BASE_SYSTEM}\n\n## LIVE TIKTOK INTELLIGENCE (Bright Data):\n{tiktok_context}"
        if tiktok_context
        else _BASE_SYSTEM
    )

    client          = get_client()
    model_id        = get_model_id()
    anthropic_msgs  = _to_anthropic_messages(messages)

    response = await client.messages.create(
        model=model_id,
        max_tokens=1024,
        system=system,
        messages=anthropic_msgs,
    )

    raw              = response.content[0].text
    visible, schedule = _parse_schedule(raw)
    return visible, schedule, model_id
