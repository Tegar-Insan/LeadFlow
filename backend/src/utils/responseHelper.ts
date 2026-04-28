import type { Response } from 'express';

interface ResponseBody {
  success: boolean;
  message: string;
  timestamp: string;
  data?: unknown;
  errors?: unknown;
}

export function success(
  res: Response,
  { message = 'Success', data = null, statusCode = 200 }: { message?: string; data?: unknown; statusCode?: number } = {},
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  } satisfies ResponseBody);
}

export function error(
  res: Response,
  { message = 'Something went wrong', errors = null, statusCode = 500 }: { message?: string; errors?: unknown; statusCode?: number } = {},
): Response {
  const body: ResponseBody = { success: false, message, timestamp: new Date().toISOString() };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

export function validationError(res: Response, errors: unknown): Response {
  return res.status(422).json({
    success: false,
    message: 'Validation failed',
    errors,
    timestamp: new Date().toISOString(),
  });
}
