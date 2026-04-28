import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/index.ts';

const SECRET = process.env['JWT_SECRET'] as string;
const EXPIRES_IN = process.env['JWT_EXPIRES_IN'] ?? '7d';
const REFRESH_EXPIRES = process.env['JWT_REFRESH_EXPIRES_IN'] ?? '30d';

const OPTIONS: jwt.SignOptions = { issuer: 'leadflow-api', audience: 'leadflow-client' };
const VERIFY_OPTIONS: jwt.VerifyOptions = { issuer: 'leadflow-api', audience: 'leadflow-client' };

export function signAccessToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, SECRET, { ...OPTIONS, expiresIn: EXPIRES_IN } as jwt.SignOptions);
}

export function signRefreshToken(payload: Record<string, unknown>): string {
  return jwt.sign(payload, SECRET + '_refresh', { ...OPTIONS, expiresIn: REFRESH_EXPIRES } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET, VERIFY_OPTIONS) as unknown as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET + '_refresh', VERIFY_OPTIONS) as unknown as JwtPayload;
}

export function decodeToken(token: string): jwt.JwtPayload | null {
  return jwt.decode(token) as jwt.JwtPayload | null;
}
