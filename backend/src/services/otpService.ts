import { randomInt } from 'crypto';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../config/supabase.ts';
import logger from '../utils/logger.ts';

const OTP_EXPIRES_MIN = parseInt(process.env['OTP_EXPIRES_MINUTES'] ?? '10', 10);
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN = 60;

export function generateOTP(): string {
  return String(randomInt(100_000, 999_999));
}

export async function storeOTP(email: string, otp: string, type = 'register'): Promise<void> {
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MIN * 60 * 1000).toISOString();
  const { error } = await supabaseAdmin.from('otp_verifications').upsert(
    { email: email.toLowerCase(), otp_hash: otpHash, type, expires_at: expiresAt, attempts: 0, verified: false },
    { onConflict: 'email,type' },
  );
  if (error) throw new Error(`storeOTP: ${error.message}`);
}

export async function verifyOTP(
  email: string,
  otp: string,
  type = 'register',
): Promise<{ valid: boolean; reason?: string }> {
  const { data, error } = await supabaseAdmin
    .from('otp_verifications')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('type', type)
    .eq('verified', false)
    .single();

  if (error || !data) return { valid: false, reason: 'OTP not found or already used.' };

  const row = data as { expires_at: string; attempts: number; otp_hash: string };

  if (new Date(row.expires_at) < new Date()) {
    await invalidateOTP(email, type);
    return { valid: false, reason: 'OTP has expired. Please request a new one.' };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await invalidateOTP(email, type);
    return { valid: false, reason: 'Too many failed attempts. Please request a new OTP.' };
  }

  const match = await bcrypt.compare(otp, row.otp_hash);
  if (!match) {
    await supabaseAdmin
      .from('otp_verifications')
      .update({ attempts: row.attempts + 1 })
      .eq('email', email.toLowerCase())
      .eq('type', type);
    const rem = MAX_ATTEMPTS - (row.attempts + 1);
    return { valid: false, reason: `Incorrect OTP. ${rem} attempt${rem !== 1 ? 's' : ''} remaining.` };
  }

  await supabaseAdmin
    .from('otp_verifications')
    .update({ verified: true })
    .eq('email', email.toLowerCase())
    .eq('type', type);

  return { valid: true };
}

export async function invalidateOTP(email: string, type = 'register'): Promise<void> {
  await supabaseAdmin
    .from('otp_verifications')
    .delete()
    .eq('email', email.toLowerCase())
    .eq('type', type);
}

export async function hasRecentOTP(email: string, type = 'register'): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('otp_verifications')
    .select('expires_at')
    .eq('email', email.toLowerCase())
    .eq('type', type)
    .eq('verified', false)
    .single();

  if (!data) return false;
  const row = data as { expires_at: string };
  const sentAt = new Date(row.expires_at).getTime() - OTP_EXPIRES_MIN * 60 * 1000;
  void logger;
  return Date.now() - sentAt < RESEND_COOLDOWN * 1000;
}
