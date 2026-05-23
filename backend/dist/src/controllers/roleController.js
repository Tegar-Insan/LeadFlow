import * as User from "../models/User.js";
import * as Role from "../models/Role.js";
import * as UserProfile from "../models/UserProfile.js";
import { success, error } from "../utils/responseHelper.js";
import { hashPassword } from "../utils/passwordHelper.js";
import { db } from "../config/db.js";
export async function getAllUsers(req, res, next) {
    try {
        const { page = 1, limit = 50, role } = req.query;
        let roleId = null;
        if (role) {
            const roleRow = await Role.findByName(role);
            if (!roleRow) {
                error(res, { message: `Unknown role: ${role}`, statusCode: 400 });
                return;
            }
            roleId = roleRow.id;
        }
        const { users, total } = await User.findAll({
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            roleId,
        });
        const normalized = (users ?? []).map((u) => ({
            id: u['id'],
            email: u['email'],
            is_active: u['is_active'],
            email_verified: u['email_verified'],
            created_at: u['created_at'],
            role_id: u['role_id'],
            role_name: u['roles']?.name ?? null,
            full_name: u['user_profiles']?.full_name ?? null,
            phone: u['user_profiles']?.phone ?? null,
        }));
        success(res, {
            message: 'Users retrieved.',
            data: { users: normalized, total, page: parseInt(page, 10), limit: parseInt(limit, 10) },
        });
    }
    catch (err) {
        next(err);
    }
}
export async function updateUserRole(req, res, next) {
    try {
        const authReq = req;
        const { id } = req.params;
        const { roleName } = req.body;
        if (!roleName) {
            error(res, { message: 'roleName is required.', statusCode: 400 });
            return;
        }
        const validRoles = ['admin', 'business_owner', 'marketing_staff'];
        if (!validRoles.includes(roleName)) {
            error(res, { message: `Invalid role. Must be one of: ${validRoles.join(', ')}`, statusCode: 400 });
            return;
        }
        if (authReq.user.userId === id) {
            error(res, { message: 'Admins cannot change their own role.', statusCode: 403 });
            return;
        }
        const user = await User.findById(id);
        if (!user) {
            error(res, { message: 'User not found.', statusCode: 404 });
            return;
        }
        const newRole = await Role.findByName(roleName);
        if (!newRole) {
            error(res, { message: 'Role not found in database.', statusCode: 404 });
            return;
        }
        const { error: dbErr } = await db.from('users').update({ role_id: newRole.id }).eq('id', id);
        if (dbErr)
            throw new Error(`updateUserRole: ${dbErr.message}`);
        success(res, { message: `Role updated to ${roleName}.`, data: { userId: id, roleName } });
    }
    catch (err) {
        next(err);
    }
}
export async function toggleUserStatus(req, res, next) {
    try {
        const authReq = req;
        const { id } = req.params;
        const { isActive } = req.body;
        if (typeof isActive !== 'boolean') {
            error(res, { message: 'isActive (boolean) is required.', statusCode: 400 });
            return;
        }
        if (authReq.user.userId === id) {
            error(res, { message: 'Admins cannot deactivate their own account.', statusCode: 403 });
            return;
        }
        const user = await User.findById(id);
        if (!user) {
            error(res, { message: 'User not found.', statusCode: 404 });
            return;
        }
        await User.setActive(id, isActive);
        success(res, {
            message: `Account ${isActive ? 'activated' : 'deactivated'}.`,
            data: { userId: id, is_active: isActive },
        });
    }
    catch (err) {
        next(err);
    }
}
export async function deleteUser(req, res, next) {
    try {
        const authReq = req;
        const { id } = req.params;
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
    }
    catch (err) {
        next(err);
    }
}
export async function createUserByAdmin(req, res, next) {
    try {
        const { email, password, fullName, phone, roleName = 'marketing_staff' } = req.body;
        if (!email || !password || !fullName) {
            error(res, { message: 'email, password, and fullName are required.', statusCode: 400 });
            return;
        }
        const validRoles = ['admin', 'business_owner', 'marketing_staff'];
        if (!validRoles.includes(roleName)) {
            error(res, { message: `Invalid role. Must be one of: ${validRoles.join(', ')}`, statusCode: 400 });
            return;
        }
        const exists = await User.emailExists(email);
        if (exists) {
            error(res, { message: 'An account with this email already exists.', statusCode: 409 });
            return;
        }
        const roleRow = await Role.findByName(roleName);
        if (!roleRow) {
            error(res, { message: 'Role not found in database.', statusCode: 404 });
            return;
        }
        const passwordHash = await hashPassword(password);
        const newUser = await User.create({ email, passwordHash, roleId: roleRow.id });
        await User.markEmailVerified(email);
        await UserProfile.create({ userId: newUser.id, fullName, phone: phone ?? null });
        success(res, {
            message: 'Account created successfully.',
            data: { userId: newUser.id, email: newUser.email, roleName },
            statusCode: 201,
        });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=roleController.js.map