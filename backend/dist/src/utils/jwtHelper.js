import jwt from 'jsonwebtoken';
const SECRET = process.env['JWT_SECRET'];
const EXPIRES_IN = process.env['JWT_EXPIRES_IN'] ?? '7d';
const REFRESH_EXPIRES = process.env['JWT_REFRESH_EXPIRES_IN'] ?? '30d';
const OPTIONS = { issuer: 'leadflow-api', audience: 'leadflow-client' };
const VERIFY_OPTIONS = { issuer: 'leadflow-api', audience: 'leadflow-client' };
export function signAccessToken(payload) {
    return jwt.sign(payload, SECRET, { ...OPTIONS, expiresIn: EXPIRES_IN });
}
export function signRefreshToken(payload) {
    return jwt.sign(payload, SECRET + '_refresh', { ...OPTIONS, expiresIn: REFRESH_EXPIRES });
}
export function verifyAccessToken(token) {
    return jwt.verify(token, SECRET, VERIFY_OPTIONS);
}
export function verifyRefreshToken(token) {
    return jwt.verify(token, SECRET + '_refresh', VERIFY_OPTIONS);
}
export function decodeToken(token) {
    return jwt.decode(token);
}
//# sourceMappingURL=jwtHelper.js.map