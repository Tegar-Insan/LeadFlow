import xss from 'xss';
function sanitizeValue(value) {
    if (typeof value === 'string')
        return xss(value.trim());
    if (Array.isArray(value))
        return value.map((v) => sanitizeValue(v));
    if (typeof value === 'object' && value !== null) {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeValue(v)]));
    }
    return value;
}
function sanitizeInput(req, _res, next) {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeValue(req.body);
    }
    next();
}
export default sanitizeInput;
//# sourceMappingURL=sanitizeInput.js.map