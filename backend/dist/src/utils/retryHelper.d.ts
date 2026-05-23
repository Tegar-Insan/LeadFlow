export interface RetryOptions {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    /** HTTP status codes considered transient and worth retrying */
    retryableStatuses: number[];
    /** Called before each retry sleep — useful for logging */
    onRetry?: (attempt: number, delayMs: number, err: unknown) => void;
}
/**
 * Retry `fn` up to `maxRetries` times on transient HTTP errors (429, 502, 503).
 *
 * - Respects `Retry-After` response headers (capped at `maxDelayMs`).
 * - Uses full-jitter exponential backoff to prevent retry storms.
 * - Never retries non-transient errors (401, 400, 403, or any status not in `retryableStatuses`).
 * - Throws the last error if all attempts are exhausted.
 */
export declare function retryWithBackoff<T>(fn: () => Promise<T>, options?: Partial<RetryOptions>): Promise<T>;
/**
 * Pre-configured options for Anthropic API calls.
 * Anthropic rate limits reset within seconds–minutes; 3 retries up to 32 s is sufficient.
 */
export declare const ANTHROPIC_RETRY: Partial<RetryOptions>;
/**
 * Pre-configured options for TikTok API calls.
 * TikTok rate limits can be longer; allow more spread with up to 60 s max delay.
 */
export declare const TIKTOK_RETRY: Partial<RetryOptions>;
//# sourceMappingURL=retryHelper.d.ts.map