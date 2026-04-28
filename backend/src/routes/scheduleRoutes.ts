/**
 * scheduleRoutes.ts
 * Content Schedule Queue routes (UC007)
 * LeadFlow – Krench Chicken
 */

import express from 'express';
import authMiddleware from '../middleware/authMiddleware.ts';
import roleMiddleware from '../middleware/roleMiddleware.ts';
import * as calendarController from '../controllers/calendarController.ts';
import * as tiktokController from '../controllers/tiktokController.ts';
import {
	scheduleCreateRules,
	scheduleUpdateRules,
} from '../validators/scheduleValidator.ts';

const router = express.Router();

// All schedule queue routes require authentication.
router.use(authMiddleware);

// Marketing Staff and Admin are the only roles allowed for UC007.
const canManageSchedule = roleMiddleware(['marketing_staff', 'admin']);

// Read
router.get('/', canManageSchedule, calendarController.getCalendarByMonth);
router.get('/drafts', canManageSchedule, calendarController.getDrafts);
router.get('/:id', canManageSchedule, calendarController.getScheduleById);

// Write
router.post('/', canManageSchedule, scheduleCreateRules, calendarController.createSchedule);
router.put('/:id', canManageSchedule, scheduleUpdateRules, calendarController.updateSchedule);
router.patch('/:id/move', canManageSchedule, calendarController.moveSchedule);
router.delete('/:id', canManageSchedule, calendarController.deleteSchedule);

// Publish shortcut from schedule queue page.
router.post('/:scheduleId/publish-now', canManageSchedule, tiktokController.directPublishBySchedule);

export default router;
