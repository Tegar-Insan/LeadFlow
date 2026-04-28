import type { Request, Response, NextFunction } from 'express';
import xss from 'xss';

type SanitizeValue = string | number | boolean | null | undefined | Record<string, unknown> | unknown[];

function sanitizeValue(value: SanitizeValue): SanitizeValue {
  if (typeof value === 'string') return xss(value.trim());
  if (Array.isArray(value)) return value.map((v) => sanitizeValue(v as SanitizeValue));
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, sanitizeValue(v as SanitizeValue)]),
    );
  }
  return value;
}

function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body as Record<string, unknown>);
  }
  next();
}

export default sanitizeInput;
