export function success(res, { message = 'Success', data = null, statusCode = 200 } = {}) {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString(),
    });
}
export function error(res, { message = 'Something went wrong', errors = null, statusCode = 500 } = {}) {
    const body = { success: false, message, timestamp: new Date().toISOString() };
    if (errors)
        body.errors = errors;
    return res.status(statusCode).json(body);
}
export function validationError(res, errors) {
    return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors,
        timestamp: new Date().toISOString(),
    });
}
//# sourceMappingURL=responseHelper.js.map