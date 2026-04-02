// src/controllers/authController.js
const authService = require('../services/authService');
const User        = require('../models/User');
const Role        = require('../models/Role');
const { verifyRefreshToken, signAccessToken } = require('../utils/jwtHelper');
const { success, error } = require('../utils/responseHelper');
const logger = require('../utils/logger');

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { email, password, fullName, phone, role } = req.body;
    const result = await authService.initiateRegistration({
      email, password, fullName, phone, roleName: role,
    });
    return success(res, {
      message: `Verification code sent to ${email}. Please check your inbox.`,
      data: { email, otpSent: true, ...(result.devOtp ? { devOtp: result.devOtp } : {}) },
    });
  } catch (err) { next(err); }
}

// POST /api/auth/verify-otp
async function verifyOTP(req, res, next) {
  try {
    const { email, otp } = req.body;
    const result = await authService.completeRegistration(email, otp);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   30 * 24 * 60 * 60 * 1000,
    });
    return success(res, {
      message:    'Account created successfully! Welcome to LeadFlow.',
      data:       { user: result.user, accessToken: result.accessToken },
      statusCode: 201,
    });
  } catch (err) { next(err); }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   30 * 24 * 60 * 60 * 1000,
    });
    return success(res, {
      message: 'Login successful.',
      data:    { user: result.user, accessToken: result.accessToken },
    });
  } catch (err) { next(err); }
}

// POST /api/auth/logout
function logout(req, res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  return success(res, { message: 'Logged out successfully.' });
}

// POST /api/auth/refresh
async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token)
      return error(res, { message: 'Refresh token not found.', statusCode: 401 });

    const decoded = verifyRefreshToken(token);
    const user    = await User.findById(decoded.userId);
    if (!user || !user.is_active)
      return error(res, { message: 'User not found or deactivated.', statusCode: 401 });

    const accessToken = signAccessToken({
      userId:   user.id,
      roleId:   user.role_id,
      roleName: user.roles?.name,
      email:    user.email,
    });
    return success(res, { message: 'Token refreshed.', data: { accessToken } });
  } catch (err) { next(err); }
}

// GET /api/auth/me
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user)
      return error(res, { message: 'User not found.', statusCode: 404 });

    return success(res, {
      data: {
        userId:        user.id,
        email:         user.email,
        roleId:        user.role_id,
        roleName:      user.roles?.name,
        fullName:      user.user_profiles?.full_name || null,
        phone:         user.user_profiles?.phone || null,
        emailVerified: user.email_verified,
        isActive:      user.is_active,
        createdAt:     user.created_at,
      },
    });
  } catch (err) { next(err); }
}

// POST /api/auth/resend-otp
async function resendOTP(req, res, next) {
  try {
    const { email, type } = req.body;
    const result = await authService.resendOTP(email, type || 'register');
    return success(res, {
      message: 'A new verification code has been sent to your email.',
      data: { email, ...(result.devOtp ? { devOtp: result.devOtp } : {}) },
    });
  } catch (err) { next(err); }
}

// GET /api/auth/roles
async function getRoles(req, res, next) {
  try {
    const roles      = await Role.findAll();
    const publicRoles = roles.filter((r) => r.name !== 'admin');
    return success(res, { data: { roles: publicRoles } });
  } catch (err) { next(err); }
}

module.exports = {
  register,
  verifyOTP,
  login,
  logout,
  refresh,
  getMe,
  resendOTP,
  getRoles,
};