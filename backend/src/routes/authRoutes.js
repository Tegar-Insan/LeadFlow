// src/routes/authRoutes.js
// Auth routes — /api/auth/*

const express         = require('express');
const authController  = require('../controllers/authController');
const authMiddleware  = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');
const {
  registerRules,
  verifyOTPRules,
  loginRules,
  resendOTPRules,
} = require('../validators/authValidator');

const router = express.Router();

// ── Public ─────────────────────────────────────────────────────
router.get('/roles',       authController.getRoles);
router.post('/register',   authLimiter, registerRules,  validateRequest, authController.register);
router.post('/verify-otp', authLimiter, verifyOTPRules, validateRequest, authController.verifyOTP);
router.post('/login',      authLimiter, loginRules,     validateRequest, authController.login);
router.post('/resend-otp', otpLimiter,  resendOTPRules, validateRequest, authController.resendOTP);
router.post('/refresh',    authController.refresh);
router.post('/logout',     authController.logout);

// ── Protected ──────────────────────────────────────────────────
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
