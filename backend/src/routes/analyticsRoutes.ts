/**
 * analyticsRoutes.ts
 * Analytics routes for Business Owner Dashboard
 * LeadFlow — Krench Chicken
 */

import express from 'express';
import * as controller from '../controllers/analyticsController.ts';
import authMiddleware from '../middleware/authMiddleware.ts';
import roleMiddleware from '../middleware/roleMiddleware.ts';

const router = express.Router();

// All analytics routes require authentication
router.use(authMiddleware);

// ─── READ (business_owner only) ───────────────────────────────────────
router.get(
  '/owner-summary',
  roleMiddleware(['business_owner']),
  controller.getOwnerSummary
);

export default router;
