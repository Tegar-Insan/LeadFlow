export function success(res: any, { message, data, statusCode }?: {
    message?: string | undefined;
    data?: null | undefined;
    statusCode?: number | undefined;
}): any;
export function error(res: any, { message, errors, statusCode }?: {
    message?: string | undefined;
    errors?: null | undefined;
    statusCode?: number | undefined;
}): any;
export function validationError(res: any, errors: any): any;
//# sourceMappingURL=responseHelper.d.ts.map