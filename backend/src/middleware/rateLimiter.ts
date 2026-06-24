import rateLimit, { type Options } from 'express-rate-limit';
import type { Request, Response } from 'express';

/**
 * Build a rate-limit handler that:
 * - Sets standard RateLimit-* headers (already done by `standardHeaders: true`)
 * - Returns a structured JSON body with `retryAfterMs` so the frontend
 *   can display an exact countdown instead of a static "wait 15 minutes" message.
 */
function makeHandler(label: string): Options['handler'] {
  return (_req: Request, res: Response, _next, options) => {
    const resetMs = options.windowMs;
    res.status(options.statusCode).json({
      success: false,
      message: `${label} — too many requests.`,
      retryAfterMs: resetMs,
      retryAfterSeconds: Math.ceil(resetMs / 1_000),
    });
  };
}

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  // Agent run status polling is exempted here and covered by its own,
  // more generous limiter (agentRunStatusLimiter) instead. A single
  // Agentic Mode run polls this endpoint every few seconds for as long as
  // the run takes, which legitimately exhausts a 100-req/15-min budget on
  // its own and was causing normal usage to 429-storm (see agentRoutes.ts).
  skip: (req: Request) => req.path.startsWith('/agent/runs/'),
  handler: makeHandler('API rate limit exceeded'),
});

// Scoped to GET /agent/runs/:runId only — deliberately much tighter window
// (60s vs 15min) but a higher relative ceiling, since the expected access
// pattern is one client polling a single run every ~4s for the run's
// duration, not a one-off request.
export const agentRunStatusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler('Agent run status rate limit exceeded'),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler('Auth rate limit exceeded'),
});

export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeHandler('OTP rate limit exceeded'),
});
