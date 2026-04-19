"""
apify_service.py
Fetches TikTok hashtag data scraped by Apify from the actor dataset.
Dataset: #ayamgorengviral (700 posts) — run ID UQEzSCOZKwMcEzRYq

Caches in-process for 1 hour. Returns [] gracefully if keys are missing.
"""

import os
import time
from typing import List, Dict, Any

import httpx
from app.utils.logger import logger

_CACHE: List[Dict[str, Any]] = []
_CACHE_TIME: float = 0.0
_CACHE_TTL: float = 3600.0  # 1 hour
_FETCH_LIMIT = 100           # enough context without blowing token budget


async def fetch_tiktok_data() -> List[Dict[str, Any]]:
    """Download (or return cached) TikTok posts from Apify dataset."""
    global _CACHE, _CACHE_TIME

    if _CACHE and (time.time() - _CACHE_TIME) < _CACHE_TTL:
        logger.info(f"[apify] Serving {len(_CACHE)} posts from cache")
        return _CACHE

    key        = os.getenv("APIFY_KEY", "").strip()
    dataset_id = os.getenv("APIFY_DATASET_ID", "").strip()

    if not key or not dataset_id:
        logger.warning("[apify] APIFY_KEY or APIFY_DATASET_ID not set — returning empty")
        return []

    url = (
        f"https://api.apify.com/v2/datasets/{dataset_id}/items"
        f"?token={key}&limit={_FETCH_LIMIT}&fields=id,text,createTimeISO,"
        f"diggCount,shareCount,playCount,collectCount,commentCount,"
        f"authorMeta,hashtags,locationMeta,searchHashtag"
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            posts = data if isinstance(data, list) else []

        _CACHE      = posts
        _CACHE_TIME = time.time()
        logger.info(f"[apify] Fetched and cached {len(posts)} TikTok posts")
        return posts

    except Exception as exc:
        logger.error(f"[apify] Fetch failed: {exc}")
        return _CACHE or []


def summarize_posts(posts: List[Dict[str, Any]], limit: int = 80) -> str:
    """
    Compress Apify TikTok posts into a token-efficient block for AI context.
    Includes engagement metrics, creator tier, location, and hashtags.
    """
    if not posts:
        return ""

    hashtag_name = ""
    if posts:
        sh = posts[0].get("searchHashtag") or {}
        hashtag_name = sh.get("name", "")
        hashtag_views = sh.get("views", 0)

    header = (
        f"Dataset: #{hashtag_name} | {hashtag_views:,} hashtag views\n"
        f"Total posts analysed: {len(posts[:limit])}\n\n"
    )

    lines = []
    for i, p in enumerate(posts[:limit]):
        caption  = (p.get("text") or "")[:120].replace("\n", " ")
        plays    = p.get("playCount") or 0
        likes    = p.get("diggCount") or 0
        shares   = p.get("shareCount") or 0
        saves    = p.get("collectCount") or 0
        comments = p.get("commentCount") or 0

        author   = p.get("authorMeta") or {}
        creator  = author.get("nickName") or author.get("name") or "unknown"
        fans     = author.get("fans") or 0
        verified = "✓" if author.get("verified") else ""

        loc      = p.get("locationMeta") or {}
        city     = loc.get("city") or ""

        tags_raw = p.get("hashtags") or []
        hashtags = " ".join(
            f"#{t['name']}" if isinstance(t, dict) else str(t)
            for t in tags_raw[:6]
        )

        lines.append(
            f'[{i+1}] "{caption}" | '
            f'plays:{plays:,} likes:{likes:,} shares:{shares:,} saves:{saves:,} comments:{comments} | '
            f'creator:{creator}{verified}(fans:{fans:,}) | '
            f'city:{city} | {hashtags}'
        )

    return header + "\n".join(lines)
