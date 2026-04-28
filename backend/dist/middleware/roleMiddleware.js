"use strict";
// src/middleware/roleMiddleware.js
// RBAC — restricts route access to specific roles
const { error } = require('../utils/responseHelper');
/**
 * Restrict route to one or more roles
 * Usage: router.get('/admin', authMiddleware, roleMiddleware(['admin']), handler)
 */
function roleMiddleware(allowedRoles = []) {
    return (req, res, next) => {
        if (!req.user) {
            return error(res, { message: 'Authentication required.', statusCode: 401 });
        }
        if (!allowedRoles.includes(req.user.roleName)) {
            return error(res, {
                message: 'You do not have permission to access this resource.',
                statusCode: 403,
            });
        }
        next();
    };
}
module.exports = roleMiddleware;
//# sourceMappingURL=roleMiddleware.js.map