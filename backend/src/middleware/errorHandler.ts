import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.ts';
import { error } from '../utils/responseHelper.ts';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function errorHandler(err: AppError, req: Request, res: Response, _next: NextFunction): void {
  logger.error(`[ErrorHandler] ${req.method} ${req.originalUrl} — ${err.message}`, {
    stack: err.stack,
    statusCode: err.statusCode,
  });

  if (err.message?.startsWith('CORS blocked')) {
    error(res, { message: err.message, statusCode: 403 });
    return;
  }

  if (err.isOperational) {
    error(res, { message: err.message, statusCode: err.statusCode ?? 400 });
    return;
  }

  const message =
    process.env['NODE_ENV'] === 'production'
      ? 'An internal server error occurred.'
      : err.message || 'Internal server error';

  error(res, { message, statusCode: err.statusCode ?? 500 });
}

export default errorHandler;
