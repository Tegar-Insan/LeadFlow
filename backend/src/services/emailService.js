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

  const subjects = { register: 'Verify Your Krench Chicken Account', login: 'Your Login Code — Krench Chicken', reset: 'Password Reset — Krench Chicken' };
  const purposes = { register: 'complete your registration', login: 'sign in to your account', reset: 'reset your password' };

  const logoUrl   = (process.env.FRONTEND_URL || 'http://localhost:5173') + '/logo.png';

  // Split OTP into individual digits for the digit-box display
  const otpDigits = String(otp).split('').map(d =>
    `<td style="padding:0 5px;">
      <div style="
        width:52px;height:64px;
        background:#0e0e0e;
        border:1px solid rgba(255,215,9,0.30);
        border-radius:10px;
        text-align:center;
        line-height:64px;
        font-size:32px;font-weight:900;color:#ffd709;
        font-family:'Courier New',monospace;
        box-shadow:0 0 18px rgba(255,215,9,0.14),inset 0 1px 0 rgba(255,231,146,0.08);
        vertical-align:middle;
      ">${d}</div>
    </td>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&family=Manrope:wght@400;500;600&display=swap" rel="stylesheet"/>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:'Manrope',Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:48px 20px;">
    <tr><td align="center">

      <!-- Card -->
      <table width="560" cellpadding="0" cellspacing="0" style="
        background:#0e0e0e;
        border-radius:20px;
        overflow:hidden;
        border:1px solid rgba(255,215,9,0.12);
        box-shadow:0 24px 48px rgba(0,0,0,0.6),0 0 0 1px rgba(255,215,9,0.04);
        max-width:560px;
        width:100%;
      ">

        <!-- Header bar — gold accent strip -->
        <tr>
          <td style="
            background:linear-gradient(135deg,#1a1500 0%,#0e0e0e 60%);
            border-bottom:1px solid rgba(255,215,9,0.15);
            padding:32px 40px;
            text-align:center;
          ">
            <!-- Logo mark -->
            <img src="${logoUrl}" width="64" height="64" alt="Krench Chicken"
              style="display:block;margin:0 auto 14px;border-radius:14px;border:0;"/>
            <h1 style="
              margin:0 0 6px;
              color:#f5f5f5;
              font-size:24px;font-weight:800;
              font-family:'Space Grotesk',Arial,sans-serif;
              letter-spacing:-0.02em;
            ">Krench Chicken</h1>
            <p style="
              margin:0;
              color:rgba(255,215,9,0.7);
              font-size:11px;
              letter-spacing:0.16em;
              text-transform:uppercase;
              font-family:'Space Grotesk',Arial,sans-serif;
              font-weight:600;
            ">TikTok Marketing Platform</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">

            <!-- Greeting -->
            <p style="
              color:#9ca3af;
              font-size:15px;
              margin:0 0 4px;
              font-family:'Manrope',Arial,sans-serif;
            ">Hello, <strong style="color:#f5f5f5;font-weight:600;">${recipientName}</strong></p>
            <p style="
              color:#6b7280;
              font-size:14px;
              margin:0 0 32px;
              line-height:1.6;
              font-family:'Manrope',Arial,sans-serif;
            ">Use the code below to <span style="color:#d1d5db;">${purposes[type] || 'verify your identity'}</span>. Expires in <strong style="color:#ffd709;">${expiry} minutes</strong>.</p>

            <!-- OTP display box — glassmorphism style -->
            <div style="
              background:#000000;
              border:1px solid rgba(255,215,9,0.15);
              border-radius:16px;
              padding:32px 28px;
              text-align:center;
              margin-bottom:28px;
              box-shadow:inset 0 1px 0 rgba(255,231,146,0.05);
            ">
              <p style="
                color:#6b7280;
                font-size:10px;
                letter-spacing:0.2em;
                text-transform:uppercase;
                margin:0 0 20px;
                font-family:'Space Grotesk',Arial,sans-serif;
                font-weight:600;
              ">Verification Code</p>

              <!-- Digit boxes -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
                <tr>${otpDigits}</tr>
              </table>

              <p style="
                color:rgba(255,215,9,0.35);
                font-size:11px;
                margin:0;
                font-family:'Manrope',Arial,sans-serif;
              ">Enter this code within ${expiry} minutes</p>
            </div>

            <!-- Warning box -->
            <div style="
              background:#111111;
              border-radius:10px;
              padding:16px 18px;
              border-left:3px solid rgba(255,215,9,0.4);
            ">
              <p style="
                color:#6b7280;
                font-size:12px;
                margin:0;
                line-height:1.7;
                font-family:'Manrope',Arial,sans-serif;
              ">
                <span style="color:#ffd709;font-weight:700;">⚠</span>&nbsp;
                Never share this code. Krench Chicken will never ask for your OTP.
                If you didn't request this, ignore this email.
              </p>
            </div>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="
            padding:20px 40px 28px;
            border-top:1px solid rgba(255,255,255,0.04);
            text-align:center;
          ">
            <p style="
              color:#374151;
              font-size:11px;
              margin:0;
              font-family:'Manrope',Arial,sans-serif;
              letter-spacing:0.02em;
            ">© ${new Date().getFullYear()} Krench Chicken · Bogor, West Java, Indonesia</p>
          </td>
        </tr>

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
