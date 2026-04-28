"use strict";
// src/utils/jwtHelper.js
// JWT sign and verify helpers — access + refresh tokens
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
const OPTIONS = { issuer: 'leadflow-api', audience: 'leadflow-client' };
function signAccessToken(payload) {
    return jwt.sign(payload, SECRET, { ...OPTIONS, expiresIn: EXPIRES_IN });
}
function signRefreshToken(payload) {
    return jwt.sign(payload, SECRET + '_refresh', { ...OPTIONS, expiresIn: REFRESH_EXPIRES });
}
function verifyAccessToken(token) {
    return jwt.verify(token, SECRET, OPTIONS);
}
function verifyRefreshToken(token) {
    return jwt.verify(token, SECRET + '_refresh', OPTIONS);
}
function decodeToken(token) {
    return jwt.decode(token);
}
module.exports = {
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    decodeToken,
};
//# sourceMappingURL=jwtHelper.js.map