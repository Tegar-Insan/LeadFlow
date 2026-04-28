// @ts-nocheck
import type { Request, Response, NextFunction } from 'express';
import * as User from '../models/User.ts';
import * as Role from '../models/Role.ts';
import * as UserProfile from '../models/UserProfile.ts';
import { success, error } from '../utils/responseHelper.ts';
import { hashPassword } from '../utils/passwordHelper.ts';
import { db } from '../config/db.ts';
import type { AuthenticatedRequest } from '../types/index.ts';

export async function getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page = 1, limit = 50, role } = req.query as Record<string, string | undefined>;

    let roleId: string | null = null;
    if (role) {
      const roleRow = await Role.findByName(role);
      if (!roleRow) { error(res, { message: `Unknown role: ${role}`, statusCode: 400 }); return; }
      roleId = (roleRow as { id: string }).id;
    }

    const { users, total } = await User.findAll({
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      roleId,
    });

    const normalized = (users as Array<Record<string, unknown>> ?? []).map((u) => ({
      id: u['id'],
      email: u['email'],
      is_active: u['is_active'],
      email_verified: u['email_verified'],
      created_at: u['created_at'],
      role_id: u['role_id'],
      role_name: (u['roles'] as { name?: string } | null)?.name ?? null,
      full_name: (u['user_profiles'] as { full_name?: string } | null)?.full_name ?? null,
      phone: (u['user_profiles'] as { phone?: string } | null)?.phone ?? null,
    }));

    success(res, {
      message: 'Users retrieved.',
      data: { users: normalized, total, page: parseInt(page as string, 10), limit: parseInt(limit as string, 10) },
    });
  } catch (err) { next(err); }
}

export async function updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params as { id: string };
    const { roleName } = req.body as { roleName?: string };

    if (!roleName) { error(res, { message: 'roleName is required.', statusCode: 400 }); return; }

    const validRoles = ['admin', 'business_owner', 'marketing_staff'];
    if (!validRoles.includes(roleName)) {
      error(res, { message: `Invalid role. Must be one of: ${validRoles.join(', ')}`, statusCode: 400 }); return;
    }
    if (authReq.user.userId === id) {
      error(res, { message: 'Admins cannot change their own role.', statusCode: 403 }); return;
    }

    const user = await User.findById(id);
    if (!user) { error(res, { message: 'User not found.', statusCode: 404 }); return; }

    const newRole = await Role.findByName(roleName);
    if (!newRole) { error(res, { message: 'Role not found in database.', statusCode: 404 }); return; }

    const { error: dbErr } = await db.from('users').update({ role_id: (newRole as { id: string }).id }).eq('id', id);
    if (dbErr) throw new Error(`updateUserRole: ${dbErr.message}`);

    success(res, { message: `Role updated to ${roleName}.`, data: { userId: id, roleName } });
  } catch (err) { next(err); }
}

export async function toggleUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params as { id: string };
    const { isActive } = req.body as { isActive?: boolean };

    if (typeof isActive !== 'boolean') { error(res, { message: 'isActive (boolean) is required.', statusCode: 400 }); return; }
    if (authReq.user.userId === id) {
      error(res, { message: 'Admins cannot deactivate their own account.', statusCode: 403 }); return;
    }

    const user = await User.findById(id);
    if (!user) { error(res, { message: 'User not found.', statusCode: 404 }); return; }

    await User.setActive(id, isActive);
    success(res, {
      message: `Account ${isActive ? 'activated' : 'deactivated'}.`,
      data: { userId: id, is_active: isActive },
    });
  } catch (err) { next(err); }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params as { id: string };

    if (authReq.user.userId === id) {
      error(res, { message: 'Admins cannot delete their own account.', statusCode: 403 });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      error(res, { message: 'User not found.', statusCode: 404 });
      return;
    }

    await User.deleteById(id);
    success(res, {
      message: 'User removed successfully.',
      data: { userId: id },
    });
  } catch (err) { next(err); }
}

export async function createUserByAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, fullName, phone, roleName = 'marketing_staff' } =
      req.body as { email?: string; password?: string; fullName?: string; phone?: string; roleName?: string };

    if (!email || !password || !fullName) {
      error(res, { message: 'email, password, and fullName are required.', statusCode: 400 }); return;
    }

    const validRoles = ['admin', 'business_owner', 'marketing_staff'];
    if (!validRoles.includes(roleName)) {
      error(res, { message: `Invalid role. Must be one of: ${validRoles.join(', ')}`, statusCode: 400 }); return;
    }

    const exists = await User.emailExists(email);
    if (exists) { error(res, { message: 'An account with this email already exists.', statusCode: 409 }); return; }

    const roleRow = await Role.findByName(roleName);
    if (!roleRow) { error(res, { message: 'Role not found in database.', statusCode: 404 }); return; }

    const passwordHash = await hashPassword(password);
    const newUser = await User.create({ email, passwordHash, roleId: (roleRow as { id: string }).id });
    await User.markEmailVerified(email);
    await UserProfile.create({ userId: (newUser as { id: string }).id, fullName, phone: phone ?? null });

    success(res, {
      message: 'Account created successfully.',
      data: { userId: (newUser as { id: string }).id, email: (newUser as { email: string }).email, roleName },
      statusCode: 201,
    });
  } catch (err) { next(err); }
}
