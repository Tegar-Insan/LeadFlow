import type { Request, Response, NextFunction } from 'express';
interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}
declare function errorHandler(err: AppError, req: Request, res: Response, _next: NextFunction): void;
export default errorHandler;
//# sourceMappingURL=errorHandler.d.ts.map