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
  handler: makeHandler('API rate limit exceeded'),
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
