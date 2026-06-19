"""
retry_helper.py
Async full-jitter exponential backoff for transient API errors (429
rate-limited, 5xx server errors). Mirrors the same strategy used in
backend/src/utils/retryHelper.ts so retry behavior is consistent
across the Node backend and this Python service.
"""

import asyncio
import random
from typing import Awaitable, Callable, Optional, Set, TypeVar

from app.utils.logger import logger

T = TypeVar("T")

DEFAULT_MAX_RETRIES = 3
DEFAULT_BASE_DELAY_SECONDS = 1.0
DEFAULT_MAX_DELAY_SECONDS = 30.0
DEFAULT_RETRYABLE_STATUSES: Set[int] = {429, 500, 502, 503}

# Server-provided RetryInfo.retryDelay is authoritative — honor it even if it
# exceeds our own jitter ceiling, but never wait absurdly long for one call.
SERVER_DELAY_SAFETY_CAP_SECONDS = 120.0


def _extract_status_code(exc: Exception) -> Optional[int]:
    """
    Works with OpenAI's APIStatusError family (.status_code) and
    google.genai.errors.APIError (.code), so this helper is reusable
    across whichever SDK is behind image_generator.py.
    """
    return getattr(exc, "code", None) or getattr(exc, "status_code", None)


def _get_error_payload(exc: Exception) -> dict:
    """
    Some SDKs (e.g. google.genai.errors.APIError) attach the raw response
    body on `.details`, e.g. {"error": {"code": 429, "message": ...}}.
    Returns the inner `error` object when present; {} for SDKs (like
    OpenAI's) that don't carry this attribute at all — the zero-quota
    and server-delay checks below simply no-op in that case.
    """
    details = getattr(exc, "details", None)
    if not isinstance(details, dict):
        return {}
    inner = details.get("error")
    return inner if isinstance(inner, dict) else details


def _extract_server_retry_delay_seconds(exc: Exception) -> Optional[float]:
    """
    Reads google.rpc.RetryInfo.retryDelay (e.g. "42s") when the error
    payload carries one, so we honor an explicit server-suggested wait
    over our own jitter. No-ops (returns None) for SDKs that don't
    surface this — those fall back to plain exponential backoff.
    """
    payload = _get_error_payload(exc)
    for item in payload.get("details") or []:
        if isinstance(item, dict) and str(item.get("@type", "")).endswith("RetryInfo"):
            raw = item.get("retryDelay")
            if isinstance(raw, str) and raw.endswith("s"):
                try:
                    return float(raw[:-1])
                except ValueError:
                    return None
    return None


def _is_permanent_zero_quota(exc: Exception) -> bool:
    """
    A quota `limit: 0` means the account/project has NO allocation at all
    for this model — not a temporarily exhausted non-zero quota. Retrying
    (at any delay) will hit the exact same rejection every time, so this
    is treated as non-retryable: fail fast instead of wasting attempts.
    Fix is account-level (enable billing / pick a model with quota), not
    something backoff can resolve.
    """
    payload = _get_error_payload(exc)
    message = str(payload.get("message") or exc)
    return "limit: 0" in message


def _compute_backoff_seconds(attempt: int, base: float, max_delay: float) -> float:
    """
    Full-jitter exponential backoff: random(0, min(base * 2^attempt, max_delay)).
    Full jitter avoids retry storms when many callers hit the same limit
    at once. See backend/src/utils/retryHelper.ts for the JS equivalent.
    """
    cap = min(base * (2**attempt), max_delay)
    return random.uniform(0, cap)


async def retry_with_backoff(
    fn: Callable[[], Awaitable[T]],
    *,
    max_retries: int = DEFAULT_MAX_RETRIES,
    base_delay_seconds: float = DEFAULT_BASE_DELAY_SECONDS,
    max_delay_seconds: float = DEFAULT_MAX_DELAY_SECONDS,
    retryable_statuses: Set[int] = DEFAULT_RETRYABLE_STATUSES,
    label: str = "retry_helper",
) -> T:
    """
    Retry `fn` up to `max_retries` times on transient HTTP errors.

    - Never retries non-transient errors (any status not in `retryable_statuses`,
      or errors with no detectable status at all).
    - Never retries a permanent zero-quota rejection (`limit: 0`) — that
      fails the exact same way on every attempt, so retrying just wastes
      time. Fails fast instead.
    - Prefers the server's own `RetryInfo.retryDelay` when present over
      our own jitter — the API knows its own rate-limit window better
      than we do. Most SDKs don't surface this, so it's an opportunistic
      improvement, not a requirement.
    - Raises the last error once attempts are exhausted.
    """
    last_exc: Optional[Exception] = None

    for attempt in range(max_retries + 1):
        try:
            return await fn()
        except Exception as exc:
            last_exc = exc
            status = _extract_status_code(exc)
            is_retryable = status in retryable_statuses and not _is_permanent_zero_quota(exc)

            if not is_retryable or attempt >= max_retries:
                raise

            server_delay = _extract_server_retry_delay_seconds(exc)
            delay = (
                min(server_delay, SERVER_DELAY_SAFETY_CAP_SECONDS)
                if server_delay is not None
                else _compute_backoff_seconds(attempt, base_delay_seconds, max_delay_seconds)
            )
            logger.warning(
                f"[{label}] HTTP {status} — attempt {attempt + 1}/{max_retries}, "
                f"retrying in {delay:.1f}s"
                + (" (server-provided delay)" if server_delay is not None else "")
            )
            await asyncio.sleep(delay)

    assert last_exc is not None
    raise last_exc
