// src/routes/authRoutes.ts
// Auth routes — /api/auth/*

import express from 'express';
import * as authController from '../controllers/authController.ts';
import authMiddleware from '../middleware/authMiddleware.ts';
import validateRequest from '../middleware/validateRequest.ts';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter.ts';
import {
  registerRules,
  verifyOTPRules,
  loginRules,
  resendOTPRules,
} from '../validators/authValidator.ts';

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

export default router;
