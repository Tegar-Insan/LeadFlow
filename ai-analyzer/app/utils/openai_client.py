"""
openai_client.py
Shared OpenAI client factory — used ONLY for image generation (GPT Image 1).
Text/idea generation stays on Anthropic everywhere else in this service
(see anthropic_client.py) — this is the one deliberate exception.
"""

import asyncio
import os

try:
    import openai
except ImportError as exc:
    raise ImportError(
        "openai is not installed. "
        "Run: pip install openai  (inside the venv)"
    ) from exc

# gpt-image-1 has a much stricter per-minute/concurrency rate limit than
# OpenAI's chat models. The Node backend chains image generation onto idea
# generation and fires one request per draft (2-3 per generation) via
# Promise.all, so without a cap here every draft beyond the first risks a
# 429 that gets silently retried inside retry_with_backoff — burning past
# the Node-side 60s axios timeout with no signal back to the caller.
# Capping at 1 serializes those calls instead of racing OpenAI's limit.
_IMAGE_GENERATION_SEMAPHORE = asyncio.Semaphore(1)

_client: openai.AsyncOpenAI | None = None


def is_configured() -> bool:
    """
    Pure check — no client construction, no exception. Single source of
    truth for both the /health endpoint and the startup log, so "is the
    image client initialized" is answered the same way everywhere.
    """
    api_key = os.getenv("IMAGE_GPT_API_KEY", "").strip()
    return bool(api_key) and not api_key.startswith("YOUR_")


def get_client() -> openai.AsyncOpenAI:
    """
    Returns a process-wide singleton. Re-used across requests instead of
    constructing a new AsyncOpenAI (and its underlying httpx connection
    pool) on every single image generation call.
    """
    global _client

    if not is_configured():
        raise ValueError(
            "IMAGE_GPT_API_KEY is not set. "
            "Add a valid key to ai-analyzer/.env: IMAGE_GPT_API_KEY=sk-..."
        )

    if _client is None:
        api_key = os.getenv("IMAGE_GPT_API_KEY", "").strip()
        # max_retries=0: the SDK's own built-in retry is invisible to
        # retry_with_backoff and holds get_image_generation_semaphore() for
        # its full duration (observed up to 60s+ on a single transient 520),
        # starving every image call queued behind it. retry_with_backoff is
        # the only retry layer now.
        _client = openai.AsyncOpenAI(api_key=api_key, max_retries=0)

    return _client


def get_image_generation_semaphore() -> asyncio.Semaphore:
    """Serializes concurrent images.generate() calls — see comment above."""
    return _IMAGE_GENERATION_SEMAPHORE


def get_image_model_id() -> str:
    # Docker Compose's ${VAR} substitution sets an empty-string env var
    # (not an absent one) when the source .env lacks the key at container
    # creation time — os.getenv's default only kicks in for a truly
    # missing key, so a blank value silently passed through as model=""
    # to every images.generate() call. `or` catches both cases.
    return os.getenv("OPENAI_IMAGE_MODEL", "").strip() or "gpt-image-1"
