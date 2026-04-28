import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/index.ts';
export declare function signAccessToken(payload: Record<string, unknown>): string;
export declare function signRefreshToken(payload: Record<string, unknown>): string;
export declare function verifyAccessToken(token: string): JwtPayload;
export declare function verifyRefreshToken(token: string): JwtPayload;
export declare function decodeToken(token: string): jwt.JwtPayload | null;
//# sourceMappingURL=jwtHelper.d.ts.map