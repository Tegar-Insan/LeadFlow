"""
tavily_health.py — Diagnostic endpoint for Tavily API connectivity.

This endpoint makes a DIRECT REST call to Tavily's API (not through MCP) to
verify the API key is valid and Tavily responds. It is the fastest way to
isolate whether the problem is:
  - the API key / network (this endpoint fails)
  - the MCP spawn / npx / Node.js (this endpoint succeeds but agent still uses
    training data — then the bug is in mcp_config.py or the SDK's MCP wiring)

Route: GET /agent/tavily/health
       POST /agent/tavily/search
"""

import os
import time

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/agent/tavily")

TAVILY_SEARCH_URL = "https://api.tavily.com/search"


def _get_key() -> str:
    key = os.environ.get("TAVILY_API_KEY", "")
    if not key:
        raise HTTPException(
            status_code=500,
            detail="TAVILY_API_KEY is not set in ai-analyzer/.env — MCP search cannot work.",
        )
    return key


class TavilySearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Search query to send directly to Tavily")
    max_results: int = Field(3, ge=1, le=10)
    search_depth: str = Field("basic", pattern="^(basic|advanced)$")


class TavilyResult(BaseModel):
    title: str
    url: str
    content: str
    score: float


class TavilyHealthResponse(BaseModel):
    ok: bool
    latency_ms: int
    api_key_prefix: str          # first 8 chars only — enough to confirm which key
    sample_query: str
    result_count: int
    top_result_title: str | None


class TavilySearchResponse(BaseModel):
    ok: bool
    latency_ms: int
    query: str
    results: list[TavilyResult]
    answer: str | None


def _call_tavily(query: str, max_results: int = 3, search_depth: str = "basic") -> tuple[dict, int]:
    """
    Direct REST call to Tavily. Returns (response_json, latency_ms).
    Raises HTTPException on API error.
    """
    key = _get_key()
    start = time.monotonic()
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                TAVILY_SEARCH_URL,
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json={
                    "query": query,
                    "search_depth": search_depth,
                    "max_results": max_results,
                    "include_answer": True,
                },
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Tavily API timed out after 15s — network issue or Tavily outage")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach Tavily API: {exc}")

    latency_ms = int((time.monotonic() - start) * 1000)

    if resp.status_code == 401:
        raise HTTPException(
            status_code=401,
            detail="Tavily rejected the API key (401 Unauthorized). Check TAVILY_API_KEY in ai-analyzer/.env",
        )
    if resp.status_code == 429:
        raise HTTPException(
            status_code=429,
            detail="Tavily rate-limited this request (429). The key is valid but quota is exhausted.",
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Tavily returned unexpected status {resp.status_code}: {resp.text[:200]}",
        )

    return resp.json(), latency_ms


@router.get("/health", response_model=TavilyHealthResponse, tags=["diagnostics"])
async def tavily_health():
    """
    Verify Tavily API connectivity by making a single minimal search.
    Does NOT go through MCP — this tests the API key and network only.

    If this succeeds but the agent still generates from training data,
    the bug is in the MCP spawn (mcp_config.py / npx / tavily-mcp package).
    If this fails, the API key or network is broken before MCP is even involved.
    """
    key = _get_key()
    sample_query = "trending TikTok food content Indonesia 2026"

    data, latency_ms = _call_tavily(sample_query, max_results=2, search_depth="basic")

    results = data.get("results", [])
    return TavilyHealthResponse(
        ok=True,
        latency_ms=latency_ms,
        api_key_prefix=key[:8] + "…",
        sample_query=sample_query,
        result_count=len(results),
        top_result_title=results[0].get("title") if results else None,
    )


@router.post("/search", response_model=TavilySearchResponse, tags=["diagnostics"])
async def tavily_search(req: TavilySearchRequest):
    """
    Run an arbitrary Tavily search directly via REST.
    Use this to confirm the query the agent would send actually returns results.

    Example body:
      { "query": "viral TikTok fried chicken Indonesia 2026", "max_results": 3 }
    """
    data, latency_ms = _call_tavily(req.query, req.max_results, req.search_depth)

    raw_results = data.get("results", [])
    results = [
        TavilyResult(
            title=r.get("title", ""),
            url=r.get("url", ""),
            content=r.get("content", "")[:500],  # truncate for readability
            score=r.get("score", 0.0),
        )
        for r in raw_results
    ]

    return TavilySearchResponse(
        ok=True,
        latency_ms=latency_ms,
        query=req.query,
        results=results,
        answer=data.get("answer"),
    )
