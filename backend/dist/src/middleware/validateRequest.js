import { validationResult } from 'express-validator';
import { validationError } from "../utils/responseHelper.js";
function validateRequest(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        validationError(res, errors.array().map((e) => ({ field: e.type === 'field' ? e.path : 'unknown', message: e.msg })));
        return;
    }
    next();
}
export default validateRequest;
//# sourceMappingURL=validateRequest.js.map