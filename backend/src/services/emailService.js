// src/services/emailService.js
// Branded OTP email delivery via Nodemailer SMTP

const nodemailer = require('nodemailer');
const logger     = require('../utils/logger');


function getTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST  || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls:    { rejectUnauthorized: false },
  });
}

async function sendOTPEmail(toEmail, otp, recipientName = 'User', type = 'register') {
  const expiry = parseInt(process.env.OTP_EXPIRES_MINUTES || '10', 10);

  const subjects = { register: 'Verify Your LeadFlow Account', login: 'LeadFlow Login Code', reset: 'LeadFlow Password Reset' };
  const purposes = { register: 'complete your registration', login: 'sign in to your account', reset: 'reset your password' };

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:16px;overflow:hidden;border:1px solid #222;">
        <tr><td style="background:#E63946;padding:28px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;">LeadFlow</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:12px;letter-spacing:1px;text-transform:uppercase;">Krench Chicken · TikTok Marketing</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="color:#9ca3af;font-size:15px;margin:0 0 6px;">Hello, <strong style="color:#f5f5f5;">${recipientName}</strong></p>
          <p style="color:#9ca3af;font-size:14px;margin:0 0 28px;">Use the code below to ${purposes[type] || 'verify your identity'}. Expires in <strong style="color:#f5f5f5;">${expiry} minutes</strong>.</p>
          <div style="background:#0a0a0a;border:1px solid #2a2a2a;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px;">
            <p style="color:#9ca3af;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;">Verification Code</p>
            <p style="color:#E63946;font-size:44px;font-weight:900;letter-spacing:12px;margin:0;font-family:monospace;">${otp}</p>
          </div>
          <div style="background:#1a1a1a;border-radius:8px;padding:14px;">
            <p style="color:#6b7280;font-size:12px;margin:0;line-height:1.6;">⚠️ Never share this code. LeadFlow will never ask for your OTP. If you didn't request this, ignore this email.</p>
          </div>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #1f1f1f;text-align:center;">
          <p style="color:#4b5563;font-size:11px;margin:0;">© ${new Date().getFullYear()} LeadFlow · Krench Chicken · Bogor, West Java, Indonesia</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  // Dev mode — log OTP to console if SMTP not configured
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
    logger.info(`\n[EMAIL DEV] OTP for ${toEmail}: ${otp}\n`);
    return { messageId: 'dev-mode', devOtp: otp };
  }

  const info = await getTransporter().sendMail({
    from:    process.env.EMAIL_FROM || '"LeadFlow" <noreply@leadflow.id>',
    to:      toEmail,
    subject: subjects[type] || 'LeadFlow Verification',
    html,
    text: `Your LeadFlow ${type} code: ${otp}\nExpires in ${expiry} minutes. Do not share this code.`,
  });

  logger.info(`[Email] OTP sent → ${toEmail} (${info.messageId})`);
  return { messageId: info.messageId };
}

module.exports = { sendOTPEmail };
