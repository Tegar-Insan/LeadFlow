// @ts-nocheck
// src/services/authService.ts
import * as User from '../models/User.ts';
import * as UserProfile from '../models/UserProfile.ts';
import * as Role from '../models/Role.ts';
import * as otpService from './otpService.ts';
import * as emailService from './emailService.ts';
import { hashPassword, comparePassword } from '../utils/passwordHelper.ts';
import { signAccessToken, signRefreshToken } from '../utils/jwtHelper.ts';
import { supabaseAdmin } from '../config/supabase.ts';
import logger from '../utils/logger.ts';

// ── Step 1: Initiate registration ─────────────────────────────────────────
export async function initiateRegistration({ email, password, fullName, phone, roleName }) {
  if (await User.emailExists(email)) {
    const err = new Error('An account with this email already exists.');
    err.statusCode = 409; throw err;
  }

  if (phone) {
    const { data: existingPhone } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('phone', phone.trim())
      .maybeSingle();
    if (existingPhone) {
      const err = new Error('This phone number is already registered to another account.');
      err.statusCode = 409; throw err;
    }
  }

  // ✅ role.id — correct column name from migration
  const role = await Role.findByName(roleName);
  if (!role) {
    const e = new Error(`Invalid role: "${roleName}"`);
    e.statusCode = 400; throw e;
  }
  if (roleName === Role.ROLE_NAMES.ADMIN) {
    const e = new Error('Admin accounts cannot be self-registered.');
    e.statusCode = 403; throw e;
  }

  if (await otpService.hasRecentOTP(email, 'register')) {
    const e = new Error('A code was recently sent. Please wait 60 seconds before retrying.');
    e.statusCode = 429; throw e;
  }

  const passwordHash = await hashPassword(password);
  // ✅ role.id — correct
  await storePendingRegistration({ email, passwordHash, fullName, phone, roleId: role.id });

  const otp = otpService.generateOTP();
  await otpService.storeOTP(email, otp, 'register');
  const mailResult = await emailService.sendOTPEmail(email, otp, fullName, 'register');

  logger.info(`[Auth] Registration OTP sent to ${email}`);
  const result = { otpSent: true };
  if (mailResult.devOtp) result.devOtp = mailResult.devOtp;
  return result;
}

async function storePendingRegistration({ email, passwordHash, fullName, phone, roleId }) {
  const { error } = await supabaseAdmin
    .from('pending_registrations')
    .upsert(
      {
        email:         email.toLowerCase(),
        password_hash: passwordHash,
        full_name:     fullName,
        phone:         phone || null,
        role_id:       roleId,
      },
      { onConflict: 'email' }
    );
  if (error) throw new Error(`storePendingRegistration: ${error.message}`);
}

// ── Step 2: Verify OTP + create account ───────────────────────────────────
export async function completeRegistration(email, otp) {
  const result = await otpService.verifyOTP(email, otp, 'register');
  if (!result.valid) {
    const e = new Error(result.reason); e.statusCode = 400; throw e;
  }

  const { data: pending, error: pErr } = await supabaseAdmin
    .from('pending_registrations')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();
  if (pErr || !pending) {
    const e = new Error('Registration session expired. Please start again.');
    e.statusCode = 400; throw e;
  }

  const user = await User.create({
    email:        pending.email,
    passwordHash: pending.password_hash,
    roleId:       pending.role_id,
  });

  await User.markEmailVerified(email);

  // ✅ user.id — correct column name
  await UserProfile.create({
    userId:   user.id,
    fullName: pending.full_name,
    phone:    pending.phone,
  });

  await supabaseAdmin
    .from('pending_registrations')
    .delete()
    .eq('email', email.toLowerCase());

  // ✅ user.roles?.name — correct column name
  logger.info(`[Auth] Account created: ${email} (${user.roles?.name})`);
  return _issueTokens(user);
}

// ── Login ──────────────────────────────────────────────────────────────────
export async function login(email, password) {
  const user = await User.findByEmail(email);
  if (!user) {
    const e = new Error('Incorrect email or password.'); e.statusCode = 401; throw e;
  }
  if (!user.is_active) {
    const e = new Error('Account deactivated. Contact the administrator.');
    e.statusCode = 403; throw e;
  }

  // ✅ user.password_hash — correct column name
  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    const e = new Error('Incorrect email or password.'); e.statusCode = 401; throw e;
  }

  logger.info(`[Auth] Login: ${email}`);
  return _issueTokens(user);
}

// ── Resend OTP ─────────────────────────────────────────────────────────────
export async function resendOTP(email, type = 'register') {
  if (await otpService.hasRecentOTP(email, type)) {
    const e = new Error('Please wait 60 seconds before requesting a new OTP.');
    e.statusCode = 429; throw e;
  }

  let displayName = email.split('@')[0];
  if (type === 'register') {
    const { data } = await supabaseAdmin
      .from('pending_registrations')
      .select('full_name')
      .eq('email', email.toLowerCase())
      .single();
    if (data?.full_name) displayName = data.full_name;
  } else {
    const user = await User.findByEmail(email);
    if (user?.user_profiles?.full_name) displayName = user.user_profiles.full_name;
  }

  await otpService.invalidateOTP(email, type);
  const otp = otpService.generateOTP();
  await otpService.storeOTP(email, otp, type);
  const mailResult = await emailService.sendOTPEmail(email, otp, displayName, type);

  const result = { otpSent: true };
  if (mailResult.devOtp) result.devOtp = mailResult.devOtp;
  return result;
}

// ── Issue JWT tokens ───────────────────────────────────────────────────────
function _issueTokens(user) {
  // ✅ All column names corrected: id, role_id, roles.name
  const payload = {
    userId:   user.id,
    roleId:   user.role_id,
    roleName: user.roles?.name,
    email:    user.email,
  };
  return {
    user: {
      userId:        user.id,
      email:         user.email,
      roleId:        user.role_id,
      roleName:      user.roles?.name,
      fullName:      user.user_profiles?.full_name || null,
      emailVerified: user.email_verified,
      isActive:      user.is_active,
    },
    accessToken:  signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}
