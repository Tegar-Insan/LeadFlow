// src/controllers/roleController.js
// Admin-only: user management (list, change role, toggle active)

const User        = require('../models/User');
const Role        = require('../models/Role');
const UserProfile = require('../models/UserProfile');
const { success, error } = require('../utils/responseHelper');
const { hashPassword }   = require('../utils/passwordHelper');

// GET /api/admin/users?page=1&limit=20&role=marketing_staff
async function getAllUsers(req, res, next) {
  try {
    const { page = 1, limit = 50, role } = req.query;

    let roleId = null;
    if (role) {
      const roleRow = await Role.findByName(role);
      if (!roleRow)
        return error(res, { message: `Unknown role: ${role}`, statusCode: 400 });
      roleId = roleRow.id;
    }

    const { users, total } = await User.findAll({
      page:   parseInt(page,  10),
      limit:  parseInt(limit, 10),
      roleId,
    });

    const normalized = (users || []).map((u) => ({
      id:            u.id,
      email:         u.email,
      is_active:     u.is_active,
      email_verified: u.email_verified,
      created_at:    u.created_at,
      role_id:       u.role_id,
      role_name:     u.roles?.name  || null,
      full_name:     u.user_profiles?.full_name || null,
      phone:         u.user_profiles?.phone     || null,
    }));

    return success(res, {
      message: 'Users retrieved.',
      data:    { users: normalized, total, page: parseInt(page, 10), limit: parseInt(limit, 10) },
    });
  } catch (err) { next(err); }
}

// PUT /api/admin/users/:id/role  — body: { roleName: 'marketing_staff' }
async function updateUserRole(req, res, next) {
  try {
    const { id }       = req.params;
    const { roleName } = req.body;

    if (!roleName)
      return error(res, { message: 'roleName is required.', statusCode: 400 });

    const validRoles = ['admin', 'business_owner', 'marketing_staff'];
    if (!validRoles.includes(roleName))
      return error(res, { message: `Invalid role. Must be one of: ${validRoles.join(', ')}`, statusCode: 400 });

    // Prevent admin from removing the last admin
    if (req.user.userId === id)
      return error(res, { message: 'Admins cannot change their own role.', statusCode: 403 });

    const user = await User.findById(id);
    if (!user) return error(res, { message: 'User not found.', statusCode: 404 });

    const newRole = await Role.findByName(roleName);
    if (!newRole) return error(res, { message: 'Role not found in database.', statusCode: 404 });

    const { db } = require('../config/db');
    const { error: dbErr } = await db
      .from('users')
      .update({ role_id: newRole.id })
      .eq('id', id);

    if (dbErr) throw new Error(`updateUserRole: ${dbErr.message}`);

    return success(res, {
      message: `Role updated to ${roleName}.`,
      data:    { userId: id, roleName },
    });
  } catch (err) { next(err); }
}

// PUT /api/admin/users/:id/status  — body: { isActive: true|false }
async function toggleUserStatus(req, res, next) {
  try {
    const { id }       = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean')
      return error(res, { message: 'isActive (boolean) is required.', statusCode: 400 });

    if (req.user.userId === id)
      return error(res, { message: 'Admins cannot deactivate their own account.', statusCode: 403 });

    const user = await User.findById(id);
    if (!user) return error(res, { message: 'User not found.', statusCode: 404 });

    await User.setActive(id, isActive);

    return success(res, {
      message: `Account ${isActive ? 'activated' : 'deactivated'}.`,
      data:    { userId: id, is_active: isActive },
    });
  } catch (err) { next(err); }
}

// POST /api/admin/users  — body: { email, password, fullName, phone, roleName }
async function createUserByAdmin(req, res, next) {
  try {
    const { email, password, fullName, phone, roleName = 'marketing_staff' } = req.body;

    if (!email || !password || !fullName)
      return error(res, { message: 'email, password, and fullName are required.', statusCode: 400 });

    const validRoles = ['admin', 'business_owner', 'marketing_staff'];
    if (!validRoles.includes(roleName))
      return error(res, { message: `Invalid role. Must be one of: ${validRoles.join(', ')}`, statusCode: 400 });

    const exists = await User.emailExists(email);
    if (exists)
      return error(res, { message: 'An account with this email already exists.', statusCode: 409 });

    const roleRow = await Role.findByName(roleName);
    if (!roleRow)
      return error(res, { message: 'Role not found in database.', statusCode: 404 });

    const passwordHash = await hashPassword(password);

    const newUser = await User.create({ email, passwordHash, roleId: roleRow.id });

    // Mark verified — admin-created accounts skip OTP
    await User.markEmailVerified(email);

    await UserProfile.create({ userId: newUser.id, fullName, phone: phone || null });

    return success(res, {
      message: 'Account created successfully.',
      data:    { userId: newUser.id, email: newUser.email, roleName },
      statusCode: 201,
    });
  } catch (err) { next(err); }
}

module.exports = { getAllUsers, updateUserRole, toggleUserStatus, createUserByAdmin };
