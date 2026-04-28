import type { Request, Response, NextFunction } from 'express';
import { error } from '../utils/responseHelper.ts';
import type { AuthenticatedRequest, UserRole } from '../types/index.ts';

function roleMiddleware(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      error(res, { message: 'Authentication required.', statusCode: 401 });
      return;
    }
    if (!allowedRoles.includes(authReq.user.roleName as UserRole)) {
      error(res, {
        message: 'You do not have permission to access this resource.',
        statusCode: 403,
      });
      return;
    }
    next();
  };
}

export default roleMiddleware;
