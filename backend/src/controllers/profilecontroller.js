// src/controllers/profileController.js
// CRUD for own profile: read, update name/phone, change password

const User            = require('../models/User');
const UserProfile     = require('../models/UserProfile');
const { hashPassword, comparePassword } = require('../utils/passwordHelper');
const { success, error } = require('../utils/responseHelper');

// GET /api/profile/me
async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return error(res, { message: 'User not found', statusCode: 404 });

    return success(res, {
      message: 'Profile fetched',
      data: {
        id:        user.id,
        email:     user.email,
        fullName:  user.user_profiles?.full_name || null,
        phone:     user.user_profiles?.phone     || null,
        roleName:  user.roles?.name              || null,
        isActive:  user.is_active,
      },
    });
  } catch (err) {
    return error(res, { message: err.message, statusCode: 500 });
  }
}

// PUT /api/profile/me — update fullName and/or phone
async function updateProfile(req, res) {
  try {
    const { fullName, phone } = req.body;

    const updates = {};
    if (fullName !== undefined) updates.fullName = fullName.trim();
    if (phone    !== undefined) updates.phone    = phone.trim() || null;

    if (Object.keys(updates).length === 0) {
      return error(res, { message: 'No fields to update', statusCode: 400 });
    }

    const profile = await UserProfile.update(req.user.userId, updates);

    return success(res, {
      message: 'Profile updated',
      data: {
        fullName: profile.full_name,
        phone:    profile.phone,
      },
    });
  } catch (err) {
    return error(res, { message: err.message, statusCode: 500 });
  }
}

// PUT /api/profile/me/password — change own password
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return error(res, { message: 'currentPassword and newPassword are required', statusCode: 400 });
    }
    if (newPassword.length < 8) {
      return error(res, { message: 'New password must be at least 8 characters', statusCode: 400 });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return error(res, { message: 'User not found', statusCode: 404 });

    const match = await comparePassword(currentPassword, user.password_hash);
    if (!match) {
      return error(res, { message: 'Current password is incorrect', statusCode: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await User.updatePassword(req.user.userId, newHash);

    return success(res, { message: 'Password changed successfully' });
  } catch (err) {
    return error(res, { message: err.message, statusCode: 500 });
  }
}

module.exports = { getProfile, updateProfile, changePassword };
