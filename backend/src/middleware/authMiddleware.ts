import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwtHelper.ts';
import { error } from '../utils/responseHelper.ts';
import type { AuthenticatedRequest } from '../types/index.ts';

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    error(res, { message: 'Authentication required. Please log in.', statusCode: 401 });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    (req as AuthenticatedRequest).user = verifyAccessToken(token as string);
    next();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      error(res, { message: 'Session expired. Please log in again.', statusCode: 401 });
      return;
    }
    error(res, { message: 'Invalid authentication token.', statusCode: 401 });
  }
}

export default authMiddleware;
