export function signAccessToken(payload: any): never;
export function signRefreshToken(payload: any): never;
export function verifyAccessToken(token: any): jwt.Jwt & jwt.JwtPayload & void;
export function verifyRefreshToken(token: any): string | jwt.JwtPayload;
export function decodeToken(token: any): string | jwt.JwtPayload | null;
import jwt = require("jsonwebtoken");
//# sourceMappingURL=jwtHelper.d.ts.map