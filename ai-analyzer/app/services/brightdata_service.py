"""
brightdata_service.py
Fetches the pre-scraped Indonesian food/beverage TikTok dataset from
Bright Data's Dataset API (Option A — snapshot download).

Caches result in-process for 1 hour to avoid repeated API calls.
Returns [] gracefully when BRIGHTDATA_DATASET_ID is not yet configured.
"""

import os
import time
from typing import List, Dict, Any

import httpx
from app.utils.logger import logger

_CACHE: List[Dict[str, Any]] = []
_CACHE_TIME: float = 0.0
_CACHE_TTL: float = 3600.0  # 1 hour


async def fetch_tiktok_data() -> List[Dict[str, Any]]:
    """Download (or return cached) TikTok posts from Bright Data."""
    global _CACHE, _CACHE_TIME

    if _CACHE and (time.time() - _CACHE_TIME) < _CACHE_TTL:
        logger.info(f"[brightdata] Serving {len(_CACHE)} posts from cache")
        return _CACHE

    key        = os.getenv("BRIGHTDATA_KEY", "").strip()
    dataset_id = os.getenv("BRIGHTDATA_DATASET_ID", "").strip()

    if not key or not dataset_id:
        logger.warning("[brightdata] BRIGHTDATA_KEY or BRIGHTDATA_DATASET_ID not set — returning empty")
        return []

    url = f"https://api.brightdata.com/datasets/v3/snapshot/{dataset_id}?format=json"
    headers = {"Authorization": f"Bearer {key}"}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            posts = resp.json() if isinstance(resp.json(), list) else []

        _CACHE      = posts
        _CACHE_TIME = time.time()
        logger.info(f"[brightdata] Fetched and cached {len(posts)} TikTok posts")
        return posts

    except Exception as exc:
        logger.error(f"[brightdata] Fetch failed: {exc}")
        return _CACHE or []   # serve stale cache on error


def summarize_posts(posts: List[Dict[str, Any]], limit: int = 80) -> str:
    """
    Compress raw Bright Data posts into a token-efficient text block
    for injection into the Claude system prompt.
    """
    if not posts:
        return ""

    lines = []
    for i, p in enumerate(posts[:limit]):
        desc     = p.get("text") or p.get("description") or p.get("caption") or p.get("content") or ""
        likes    = p.get("digg_count") or p.get("like_count") or p.get("likes") or 0
        comments = p.get("comment_count") or p.get("comments") or 0
        shares   = p.get("share_count") or p.get("shares") or 0
        tags_raw = p.get("hashtags") or []
        hashtags = " ".join(
            f"#{t['name']}" if isinstance(t, dict) else str(t)
            for t in tags_raw
        )
        lines.append(
            f'[{i+1}] "{desc[:120]}" | '
            f'likes:{likes} comments:{comments} shares:{shares} | {hashtags}'
        )

    return "\n".join(lines)
