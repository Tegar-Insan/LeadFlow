"""
anthropic_client.py
Shared Anthropic client factory.

Usage:
    from app.utils.anthropic_client import get_client, get_model_id

    client   = get_client()      # anthropic.AsyncAnthropic
    model_id = get_model_id()    # e.g. "claude-haiku-4-5-20251001"
"""

import os

try:
    import anthropic
except ImportError as exc:
    raise ImportError(
        "anthropic is not installed. "
        "Run: pip install anthropic  (inside the venv)"
    ) from exc


def get_client() -> anthropic.AsyncAnthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()

    if not api_key or api_key.startswith("YOUR_"):
        raise ValueError(
            "ANTHROPIC_API_KEY is not set. "
            "Add a valid key to ai-analyzer/.env: ANTHROPIC_API_KEY=sk-ant-..."
        )

    return anthropic.AsyncAnthropic(api_key=api_key)


def get_model_id() -> str:
    return os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001").strip()
