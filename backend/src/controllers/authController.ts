// @ts-nocheck
import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService.ts';
import * as User from '../models/User.ts';
import * as Role from '../models/Role.ts';
import { verifyRefreshToken, signAccessToken } from '../utils/jwtHelper.ts';
import { success, error } from '../utils/responseHelper.ts';
import logger from '../utils/logger.ts';
import type { AuthenticatedRequest } from '../types/index.ts';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, fullName, phone, role } = req.body as {
      email: string; password: string; fullName: string; phone: string; role: string;
    };
    const result = await authService.initiateRegistration({ email, password, fullName, phone, roleName: role });
    success(res, {
      message: `Verification code sent to ${email}. Please check your inbox.`,
      data: { email, otpSent: true, ...(result.devOtp ? { devOtp: result.devOtp } : {}) },
    });
  } catch (err) { next(err); }
}

export async function verifyOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, otp } = req.body as { email: string; otp: string };
    const result = await authService.completeRegistration(email, otp);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    success(res, {
      message: 'Account created successfully! Welcome to LeadFlow.',
      data: { user: result.user, accessToken: result.accessToken },
      statusCode: 201,
    });
  } catch (err) { next(err); }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const result = await authService.login(email, password);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    success(res, { message: 'Login successful.', data: { user: result.user, accessToken: result.accessToken } });
  } catch (err) { next(err); }
}

export function logout(req: Request, res: Response): void {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
  });
  success(res, { message: 'Logged out successfully.' });
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = (req.cookies as Record<string, string | undefined>)['refreshToken'];
    if (!token) { error(res, { message: 'Refresh token not found.', statusCode: 401 }); return; }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId);
    if (!user || !user.is_active) { error(res, { message: 'User not found or deactivated.', statusCode: 401 }); return; }

    const accessToken = signAccessToken({
      userId: user.id as string,
      roleId: user.role_id as string,
      roleName: (user.roles as { name: string } | null)?.name ?? '',
      email: user.email as string,
    });
    success(res, { message: 'Token refreshed.', data: { accessToken } });
  } catch (err) { next(err); }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = await User.findById(authReq.user.userId);
    if (!user) { error(res, { message: 'User not found.', statusCode: 404 }); return; }

    const profiles = user.user_profiles as { full_name?: string; phone?: string } | null;
    success(res, {
      data: {
        userId: user.id,
        email: user.email,
        roleId: user.role_id,
        roleName: (user.roles as { name?: string } | null)?.name ?? null,
        fullName: profiles?.full_name ?? null,
        phone: profiles?.phone ?? null,
        emailVerified: user.email_verified,
        isActive: user.is_active,
        createdAt: user.created_at,
      },
    });
  } catch (err) { next(err); }
}

export async function resendOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, type } = req.body as { email: string; type?: string };
    const result = await authService.resendOTP(email, type ?? 'register');
    success(res, {
      message: 'A new verification code has been sent to your email.',
      data: { email, ...(result.devOtp ? { devOtp: result.devOtp } : {}) },
    });
  } catch (err) { next(err); }
}

export async function getRoles(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roles = await Role.findAll();
    const publicRoles = (roles as Array<{ name: string }>).filter((r) => r.name !== 'admin');
    success(res, { data: { roles: publicRoles } });
  } catch (err) { next(err); }
}
