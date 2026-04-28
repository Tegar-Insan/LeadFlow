"use strict";
// src/middleware/authMiddleware.js
// JWT Bearer token verification — attaches decoded user to req.user
const { verifyAccessToken } = require('../utils/jwtHelper');
const { error } = require('../utils/responseHelper');
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return error(res, { message: 'Authentication required. Please log in.', statusCode: 401 });
    }
    const token = authHeader.split(' ')[1];
    try {
        req.user = verifyAccessToken(token);
        next();
    }
    catch (err) {
        if (err.name === 'TokenExpiredError') {
            return error(res, { message: 'Session expired. Please log in again.', statusCode: 401 });
        }
        return error(res, { message: 'Invalid authentication token.', statusCode: 401 });
    }
}
module.exports = authMiddleware;
//# sourceMappingURL=authMiddleware.js.map