import * as User from "../models/User.js";
import * as Role from "../models/Role.js";
import { verifyRefreshToken, signAccessToken } from "../utils/jwtHelper.js";
import { success, error } from "../utils/responseHelper.js";
import logger from "../utils/logger.js";
export async function register(req, res, next) {
    try {
        const { email, password, fullName, phone, role } = req.body;
        const result = await User.initiateRegistration({ email, password, fullName, phone, roleName: role });
        success(res, {
            message: `Verification code sent to ${email}. Please check your inbox.`,
            data: { email, otpSent: true, ...(result.devOtp ? { devOtp: result.devOtp } : {}) },
        });
    }
    catch (err) {
        next(err);
    }
}
export async function verifyOTP(req, res, next) {
    try {
        const { email, otp } = req.body;
        const result = await User.completeRegistration(email, otp);
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
    }
    catch (err) {
        next(err);
    }
}
export async function login(req, res, next) {
    try {
        const { email, password } = req.body;
        const result = await User.login(email, password);
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env['NODE_ENV'] === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        success(res, { message: 'Login successful.', data: { user: result.user, accessToken: result.accessToken } });
    }
    catch (err) {
        next(err);
    }
}
export function logout(req, res) {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict',
    });
    success(res, { message: 'Logged out successfully.' });
}
export async function refresh(req, res, next) {
    try {
        const token = req.cookies['refreshToken'];
        if (!token) {
            error(res, { message: 'Refresh token not found.', statusCode: 401 });
            return;
        }
        const decoded = verifyRefreshToken(token);
        const user = await User.findById(decoded.userId);
        if (!user || !user.is_active) {
            error(res, { message: 'User not found or deactivated.', statusCode: 401 });
            return;
        }
        const accessToken = signAccessToken({
            userId: user.id,
            roleId: user.role_id,
            roleName: user.roles?.name ?? '',
            email: user.email,
        });
        success(res, { message: 'Token refreshed.', data: { accessToken } });
    }
    catch (err) {
        next(err);
    }
}
export async function getMe(req, res, next) {
    try {
        const authReq = req;
        const userId = authReq.user?.userId;
        if (!userId) {
            error(res, { message: 'Unauthorized.', statusCode: 401 });
            return;
        }
        const user = await User.findById(userId);
        if (!user) {
            error(res, { message: 'User not found.', statusCode: 404 });
            return;
        }
        const profiles = user.user_profiles;
        success(res, {
            data: {
                userId: user.id,
                email: user.email,
                roleId: user.role_id,
                roleName: user.roles?.name ?? null,
                fullName: profiles?.full_name ?? null,
                phone: profiles?.phone ?? null,
                emailVerified: user.email_verified,
                isActive: user.is_active,
                createdAt: user.created_at,
            },
        });
    }
    catch (err) {
        next(err);
    }
}
export async function resendOTP(req, res, next) {
    try {
        const { email, type } = req.body;
        const result = await User.resendOTP(email, type ?? 'register');
        success(res, {
            message: 'A new verification code has been sent to your email.',
            data: { email, ...(result.devOtp ? { devOtp: result.devOtp } : {}) },
        });
    }
    catch (err) {
        next(err);
    }
}
export async function getRoles(_req, res, next) {
    try {
        const roles = await Role.findAll();
        const publicRoles = roles.filter((r) => r.name !== 'admin');
        success(res, { data: { roles: publicRoles } });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=authController.js.map