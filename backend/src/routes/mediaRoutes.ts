/**
 * mediaRoutes.ts
 * Routes for Media Upload (UC008)
 * LeadFlow – Krench Chicken
 */

import express from 'express';
import * as controller from '../controllers/mediaController.ts';
import authMiddleware from '../middleware/authMiddleware.ts';
import roleMiddleware from '../middleware/roleMiddleware.ts';

const router = express.Router();

router.use(authMiddleware);
const requireRole = roleMiddleware;

// Upload files to a schedule slot
router.post(
  '/upload/:scheduleId',
  requireRole(['marketing_staff', 'admin']),
  controller.uploadMiddleware,
  controller.uploadMedia
);

// Get all media for a schedule
router.get(
  '/:scheduleId',
  requireRole(['marketing_staff', 'business_owner', 'admin']),
  controller.getMediaBySchedule
);

// Delete a single asset
router.delete(
  '/:assetId',
  requireRole(['marketing_staff', 'admin']),
  controller.deleteMedia
);

export default router;