// src/middleware/rateLimiter.js
// Rate limiting — brute-force and OTP spam protection

const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Retry after 15 minutes.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts. Retry after 15 minutes.' },
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, max: 5,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many OTP requests. Retry after 10 minutes.' },
});

module.exports = { apiLimiter, authLimiter, otpLimiter };
