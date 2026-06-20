// src/models/User.ts
import { db } from "../config/db.js";
import { supabaseAdmin } from "../config/supabase.js";
import * as UserProfile from "./UserProfile.js";
import * as Role from "./Role.js";
import * as otpService from "../services/otpService.js";
import * as emailService from "../services/emailService.js";
import { hashPassword, comparePassword } from "../utils/passwordHelper.js";
import { signAccessToken, signRefreshToken } from "../utils/jwtHelper.js";
import logger from "../utils/logger.js";
// Matches EXACT column names from 002_create_users.sql + 001_create_roles.sql
const SELECT_WITH_RELATIONS = `
  id, role_id, email, password_hash, is_active, email_verified,
  created_at, updated_at,
  roles ( id, name ),
  user_profiles ( id, full_name, phone )
`;
export async function findByEmail(email) {
    const { data, error } = await db
        .from('users')
        .select(SELECT_WITH_RELATIONS)
        .eq('email', email.toLowerCase())
        .single();
    if (error)
        return null;
    return data;
}
export async function findById(userId) {
    const { data, error } = await db
        .from('users')
        .select(SELECT_WITH_RELATIONS)
        .eq('id', userId)
        .single();
    if (error)
        return null;
    return data;
}
// ✅ CORRECT — 'id' is the correct column name
export async function emailExists(email) {
    const { data } = await db
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();
    return !!data;
}
export async function create({ email, passwordHash, roleId }) {
    // ✅ upsert — handles duplicate email from retry attempts
    const { data, error } = await db
        .from('users')
        .upsert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role_id: roleId,
        is_active: true,
        email_verified: false,
    }, { onConflict: 'email' })
        .select(`id, role_id, email, is_active, email_verified, created_at, roles(id, name)`)
        .single();
    if (error)
        throw new Error(`User.create: ${error.message}`);
    return data;
}
export async function markEmailVerified(email) {
    const { error } = await db
        .from('users')
        .update({ email_verified: true })
        .eq('email', email.toLowerCase());
    if (error)
        throw new Error(`User.markEmailVerified: ${error.message}`);
}
export async function updatePassword(userId, passwordHash) {
    const { error } = await db
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('id', userId);
    if (error)
        throw new Error(`User.updatePassword: ${error.message}`);
}
export async function setActive(userId, isActive) {
    const { error } = await db
        .from('users')
        .update({ is_active: isActive })
        .eq('id', userId);
    if (error)
        throw new Error(`User.setActive: ${error.message}`);
}
export async function deleteById(userId) {
    const { error } = await db
        .from('users')
        .delete()
        .eq('id', userId);
    if (error)
        throw new Error(`User.deleteById: ${error.message}`);
}
export async function findAll({ page = 1, limit = 20, roleId = null } = {}) {
    let q = db
        .from('users')
        .select(`id, role_id, email, is_active, email_verified, created_at,
       roles(id, name), user_profiles(full_name, phone)`, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
    if (roleId)
        q = q.eq('role_id', roleId);
    const { data, error, count } = await q;
    if (error)
        throw new Error(`User.findAll: ${error.message}`);
    return { users: data, total: count };
}
// ── Business logic: Registration / Login (moved from authService.ts) ───────
async function storePendingRegistration({ email, passwordHash, fullName, phone, roleId }) {
    const { error } = await supabaseAdmin
        .from('pending_registrations')
        .upsert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        full_name: fullName,
        phone: phone || null,
        role_id: roleId,
    }, { onConflict: 'email' });
    if (error)
        throw new Error(`storePendingRegistration: ${error.message}`);
}
function issueTokens(user) {
    const payload = {
        userId: user.id,
        roleId: user.role_id,
        roleName: user.roles?.name,
        email: user.email,
    };
    return {
        user: {
            userId: user.id,
            email: user.email,
            roleId: user.role_id,
            roleName: user.roles?.name,
            fullName: user.user_profiles?.full_name || null,
            emailVerified: user.email_verified,
            isActive: user.is_active,
        },
        accessToken: signAccessToken(payload),
        refreshToken: signRefreshToken(payload),
    };
}
export async function initiateRegistration({ email, password, fullName, phone, roleName }) {
    if (await emailExists(email)) {
        const err = new Error('An account with this email already exists.');
        err.statusCode = 409;
        throw err;
    }
    if (phone) {
        const { data: existingPhone } = await supabaseAdmin
            .from('user_profiles')
            .select('id')
            .eq('phone', phone.trim())
            .maybeSingle();
        if (existingPhone) {
            const err = new Error('This phone number is already registered to another account.');
            err.statusCode = 409;
            throw err;
        }
    }
    const role = await Role.findByName(roleName);
    if (!role) {
        const e = new Error(`Invalid role: "${roleName}"`);
        e.statusCode = 400;
        throw e;
    }
    if (roleName === Role.ROLE_NAMES.ADMIN) {
        const e = new Error('Admin accounts cannot be self-registered.');
        e.statusCode = 403;
        throw e;
    }
    if (await otpService.hasRecentOTP(email, 'register')) {
        const e = new Error('A code was recently sent. Please wait 60 seconds before retrying.');
        e.statusCode = 429;
        throw e;
    }
    const passwordHash = await hashPassword(password);
    await storePendingRegistration({ email, passwordHash, fullName, phone: phone ?? null, roleId: role.id });
    const otp = otpService.generateOTP();
    await otpService.storeOTP(email, otp, 'register');
    const mailResult = await emailService.sendOTPEmail(email, otp, fullName, 'register');
    logger.info(`[User] Registration OTP sent to ${email}`);
    const result = { otpSent: true };
    if (mailResult.devOtp)
        result.devOtp = mailResult.devOtp;
    return result;
}
export async function completeRegistration(email, otp) {
    const result = await otpService.verifyOTP(email, otp, 'register');
    if (!result.valid) {
        const e = new Error(result.reason);
        e.statusCode = 400;
        throw e;
    }
    const { data: pending, error: pErr } = await supabaseAdmin
        .from('pending_registrations')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
    if (pErr || !pending) {
        const e = new Error('Registration session expired. Please start again.');
        e.statusCode = 400;
        throw e;
    }
    const user = await create({
        email: pending.email,
        passwordHash: pending.password_hash,
        roleId: pending.role_id,
    });
    await markEmailVerified(email);
    await UserProfile.create({
        userId: user.id,
        fullName: pending.full_name,
        phone: pending.phone,
    });
    await supabaseAdmin
        .from('pending_registrations')
        .delete()
        .eq('email', email.toLowerCase());
    logger.info(`[User] Account created: ${email} (${user.roles?.name})`);
    return issueTokens(user);
}
export async function login(email, password) {
    const user = await findByEmail(email);
    if (!user) {
        const e = new Error('Incorrect email or password.');
        e.statusCode = 401;
        throw e;
    }
    if (!user.is_active) {
        const e = new Error('Account deactivated. Contact the administrator.');
        e.statusCode = 403;
        throw e;
    }
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
        const e = new Error('Incorrect email or password.');
        e.statusCode = 401;
        throw e;
    }
    logger.info(`[User] Login: ${email}`);
    return issueTokens(user);
}
export async function resendOTP(email, type = 'register') {
    if (await otpService.hasRecentOTP(email, type)) {
        const e = new Error('Please wait 60 seconds before requesting a new OTP.');
        e.statusCode = 429;
        throw e;
    }
    let displayName = email.split('@')[0];
    if (type === 'register') {
        const { data } = await supabaseAdmin
            .from('pending_registrations')
            .select('full_name')
            .eq('email', email.toLowerCase())
            .single();
        if (data?.full_name)
            displayName = data.full_name;
    }
    else {
        const user = await findByEmail(email);
        if (user?.user_profiles?.full_name)
            displayName = user.user_profiles.full_name;
    }
    await otpService.invalidateOTP(email, type);
    const otp = otpService.generateOTP();
    await otpService.storeOTP(email, otp, type);
    const mailResult = await emailService.sendOTPEmail(email, otp, displayName, type);
    const result = { otpSent: true };
    if (mailResult.devOtp)
        result.devOtp = mailResult.devOtp;
    return result;
}
//# sourceMappingURL=User.js.map