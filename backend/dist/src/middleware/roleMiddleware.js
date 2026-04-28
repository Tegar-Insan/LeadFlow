import { error } from "../utils/responseHelper.js";
function roleMiddleware(allowedRoles) {
    return (req, res, next) => {
        const authReq = req;
        if (!authReq.user) {
            error(res, { message: 'Authentication required.', statusCode: 401 });
            return;
        }
        if (!allowedRoles.includes(authReq.user.roleName)) {
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
//# sourceMappingURL=roleMiddleware.js.map