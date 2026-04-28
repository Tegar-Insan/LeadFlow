import type { Request } from 'express';

export interface JwtPayload {
  userId: string;
  roleId: string;
  roleName: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export type UserRole = 'admin' | 'business_owner' | 'marketing_staff';

export interface SuccessOptions {
  message?: string;
  data?: unknown;
  statusCode?: number;
}

export interface ErrorOptions {
  message?: string;
  errors?: unknown;
  statusCode?: number;
}
