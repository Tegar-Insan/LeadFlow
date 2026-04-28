import { verifyAccessToken } from "../utils/jwtHelper.js";
import { error } from "../utils/responseHelper.js";
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        error(res, { message: 'Authentication required. Please log in.', statusCode: 401 });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        req.user = verifyAccessToken(token);
        next();
    }
    catch (err) {
        if (err instanceof Error && err.name === 'TokenExpiredError') {
            error(res, { message: 'Session expired. Please log in again.', statusCode: 401 });
            return;
        }
        error(res, { message: 'Invalid authentication token.', statusCode: 401 });
    }
}
export default authMiddleware;
//# sourceMappingURL=authMiddleware.js.map