/**
 * calendarRoutes.ts
 * Routes for Content Calendar (UC007)
 * LeadFlow – Krench Chicken
 */

import express from 'express';
import * as controller from '../controllers/calendarController.ts';
import authMiddleware from '../middleware/authMiddleware.ts';
import roleMiddleware from '../middleware/roleMiddleware.ts';
import { scheduleCreateRules, scheduleUpdateRules } from '../validators/scheduleValidator.ts';

const router = express.Router();

// All calendar routes require auth
router.use(authMiddleware);
const requireRole = roleMiddleware;

// ─── READ (marketing_staff + business_owner + admin) ───────────────
router.get(
  '/',
  requireRole(['marketing_staff', 'business_owner', 'admin']),
  controller.getCalendarByMonth
);

router.get(
  '/drafts',
  requireRole(['marketing_staff', 'business_owner', 'admin']),
  controller.getDrafts
);

router.get(
  '/list',
  requireRole(['marketing_staff', 'business_owner']),
  controller.getListView
);

router.get(
  '/:id',
  requireRole(['marketing_staff', 'business_owner', 'admin']),
  controller.getScheduleById
);

// ─── WRITE (marketing_staff + admin only) ──────────────────────────
router.post(
  '/',
  requireRole(['marketing_staff', 'admin']),
  scheduleCreateRules,
  controller.createSchedule
);

router.put(
  '/:id',
  requireRole(['marketing_staff', 'admin']),
  scheduleUpdateRules,
  controller.updateSchedule
);

// Drag & Drop move
router.patch(
  '/:id/move',
  requireRole(['marketing_staff', 'admin']),
  controller.moveSchedule
);

// "Add to Queue" — draft only, queues for the same WIB time tomorrow
router.patch(
  '/:id/add-to-queue',
  requireRole(['marketing_staff', 'admin']),
  controller.addToQueue
);

router.delete(
  '/:id',
  requireRole(['marketing_staff', 'admin']),
  controller.deleteSchedule
);

export default router;