"use strict";
// src/middleware/validateRequest.js
// Runs express-validator result check and returns 422 on failure
const { validationResult } = require('express-validator');
const { validationError } = require('../utils/responseHelper');
function validateRequest(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return validationError(res, errors.array().map((e) => ({ field: e.path, message: e.msg })));
    }
    next();
}
module.exports = validateRequest;
//# sourceMappingURL=validateRequest.js.map