import logger from "./logger.js";
const DEFAULTS = {
    maxRetries: 3,
    baseDelayMs: 1_000,
    maxDelayMs: 30_000,
    retryableStatuses: [429, 502, 503],
};
/**
 * Parse a Retry-After header value into milliseconds.
 * Supports both integer-seconds and HTTP-date formats.
 */
function parseRetryAfterMs(header, maxDelayMs) {
    if (!header)
        return null;
    // Integer seconds (most common: "60")
    const seconds = Number(header.trim());
    if (!Number.isNaN(seconds) && seconds > 0) {
        return Math.min(seconds * 1_000, maxDelayMs);
    }
    // HTTP-date format ("Wed, 21 Jan 2026 07:28:00 GMT")
    const date = new Date(header);
    if (!Number.isNaN(date.getTime())) {
        const diff = date.getTime() - Date.now();
        return diff > 0 ? Math.min(diff, maxDelayMs) : null;
    }
    return null;
}
/**
 * Extract the HTTP status and Retry-After header from an unknown error.
 * Works with both Anthropic SDK errors and Axios errors.
 */
function extractErrorInfo(err) {
    if (err && typeof err === 'object') {
        const e = err;
        // Anthropic SDK: e.status (number), e.headers (Headers-like object)
        if (typeof e['status'] === 'number') {
            const headers = e['headers'];
            return {
                status: e['status'],
                retryAfter: headers?.['retry-after'],
            };
        }
        // Axios: e.response.status, e.response.headers
        const response = e['response'];
        if (response && typeof response['status'] === 'number') {
            const headers = response['headers'];
            return {
                status: response['status'],
                retryAfter: headers?.['retry-after'],
            };
        }
    }
    return { status: null, retryAfter: undefined };
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Full-jitter exponential backoff.
 *
 * Formula: actualDelay = random(0, min(baseDelay * 2^attempt, maxDelay))
 *
 * Full jitter (vs fixed or half jitter) is the most effective strategy for
 * avoiding retry storms when many callers hit the same limit simultaneously.
 * Each caller sleeps a different random duration within the window.
 *
 * Reference: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 */
function computeBackoffMs(attempt, base, max) {
    const cap = Math.min(base * Math.pow(2, attempt), max);
    return Math.floor(Math.random() * cap);
}
/**
 * Retry `fn` up to `maxRetries` times on transient HTTP errors (429, 502, 503).
 *
 * - Respects `Retry-After` response headers (capped at `maxDelayMs`).
 * - Uses full-jitter exponential backoff to prevent retry storms.
 * - Never retries non-transient errors (401, 400, 403, or any status not in `retryableStatuses`).
 * - Throws the last error if all attempts are exhausted.
 */
export async function retryWithBackoff(fn, options) {
    const opts = { ...DEFAULTS, ...options };
    let lastErr;
    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            lastErr = err;
            const { status, retryAfter } = extractErrorInfo(err);
            const isRetryable = status !== null && opts.retryableStatuses.includes(status);
            if (!isRetryable || attempt >= opts.maxRetries) {
                throw err;
            }
            // Prefer server-dictated delay; fall back to full-jitter backoff
            const delayMs = parseRetryAfterMs(retryAfter, opts.maxDelayMs) ??
                computeBackoffMs(attempt, opts.baseDelayMs, opts.maxDelayMs);
            if (opts.onRetry) {
                opts.onRetry(attempt + 1, delayMs, err);
            }
            else {
                logger.warn(`[retryHelper] HTTP ${status} — attempt ${attempt + 1}/${opts.maxRetries}, ` +
                    `retrying in ${delayMs}ms${retryAfter ? ` (Retry-After: ${retryAfter})` : ''}`);
            }
            await sleep(delayMs);
        }
    }
    throw lastErr;
}
/**
 * Pre-configured options for Anthropic API calls.
 * Anthropic rate limits reset within seconds–minutes; 3 retries up to 32 s is sufficient.
 */
export const ANTHROPIC_RETRY = {
    maxRetries: 3,
    baseDelayMs: 1_000,
    maxDelayMs: 32_000,
    retryableStatuses: [429, 529], // 529 = Anthropic overloaded
};
/**
 * Pre-configured options for TikTok API calls.
 * TikTok rate limits can be longer; allow more spread with up to 60 s max delay.
 */
export const TIKTOK_RETRY = {
    maxRetries: 3,
    baseDelayMs: 2_000,
    maxDelayMs: 60_000,
    retryableStatuses: [429, 502, 503],
};
//# sourceMappingURL=retryHelper.js.map