"use strict";
// src/services/otpService.js
// OTP generation, storage (hashed), verification, and cleanup
const { randomInt } = require('crypto');
const bcrypt = require('bcryptjs');
const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const OTP_EXPIRES_MIN = parseInt(process.env.OTP_EXPIRES_MINUTES || '10', 10);
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN = 60; // seconds
function generateOTP() {
    return String(randomInt(100000, 999999));
}
async function storeOTP(email, otp, type = 'register') {
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MIN * 60 * 1000).toISOString();
    const { error } = await supabaseAdmin.from('otp_verifications').upsert({ email: email.toLowerCase(), otp_hash: otpHash, type, expires_at: expiresAt, attempts: 0, verified: false }, { onConflict: 'email,type' });
    if (error)
        throw new Error(`storeOTP: ${error.message}`);
}
async function verifyOTP(email, otp, type = 'register') {
    const { data, error } = await supabaseAdmin
        .from('otp_verifications')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('type', type)
        .eq('verified', false)
        .single();
    if (error || !data)
        return { valid: false, reason: 'OTP not found or already used.' };
    if (new Date(data.expires_at) < new Date()) {
        await invalidateOTP(email, type);
        return { valid: false, reason: 'OTP has expired. Please request a new one.' };
    }
    if (data.attempts >= MAX_ATTEMPTS) {
        await invalidateOTP(email, type);
        return { valid: false, reason: 'Too many failed attempts. Please request a new OTP.' };
    }
    const match = await bcrypt.compare(otp, data.otp_hash);
    if (!match) {
        await supabaseAdmin
            .from('otp_verifications')
            .update({ attempts: data.attempts + 1 })
            .eq('email', email.toLowerCase())
            .eq('type', type);
        const rem = MAX_ATTEMPTS - (data.attempts + 1);
        return { valid: false, reason: `Incorrect OTP. ${rem} attempt${rem !== 1 ? 's' : ''} remaining.` };
    }
    await supabaseAdmin
        .from('otp_verifications')
        .update({ verified: true })
        .eq('email', email.toLowerCase())
        .eq('type', type);
    return { valid: true };
}
async function invalidateOTP(email, type = 'register') {
    await supabaseAdmin
        .from('otp_verifications')
        .delete()
        .eq('email', email.toLowerCase())
        .eq('type', type);
}
async function hasRecentOTP(email, type = 'register') {
    const { data } = await supabaseAdmin
        .from('otp_verifications')
        .select('expires_at')
        .eq('email', email.toLowerCase())
        .eq('type', type)
        .eq('verified', false)
        .single();
    if (!data)
        return false;
    // OTP expires_at = now + OTP_EXPIRES_MIN. Cooldown = expires_at - (OTP_EXPIRES_MIN - RESEND_COOLDOWN/60) min
    const sentAt = new Date(data.expires_at).getTime() - OTP_EXPIRES_MIN * 60 * 1000;
    return Date.now() - sentAt < RESEND_COOLDOWN * 1000;
}
module.exports = { generateOTP, storeOTP, verifyOTP, invalidateOTP, hasRecentOTP };
//# sourceMappingURL=otpService.js.map