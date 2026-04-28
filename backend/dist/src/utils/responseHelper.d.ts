import type { Response } from 'express';
export declare function success(res: Response, { message, data, statusCode }?: {
    message?: string;
    data?: unknown;
    statusCode?: number;
}): Response;
export declare function error(res: Response, { message, errors, statusCode }?: {
    message?: string;
    errors?: unknown;
    statusCode?: number;
}): Response;
export declare function validationError(res: Response, errors: unknown): Response;
//# sourceMappingURL=responseHelper.d.ts.map