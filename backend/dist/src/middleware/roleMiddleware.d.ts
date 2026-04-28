import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../types/index.ts';
declare function roleMiddleware(allowedRoles: UserRole[]): (req: Request, res: Response, next: NextFunction) => void;
export default roleMiddleware;
//# sourceMappingURL=roleMiddleware.d.ts.map