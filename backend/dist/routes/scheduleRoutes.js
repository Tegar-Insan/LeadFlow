"use strict";
/**
 * scheduleRoutes.js
 * Content Schedule Queue routes (UC007)
 * LeadFlow – Krench Chicken
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const calendarController = require('../controllers/calendarController');
const tiktokController = require('../controllers/tiktokController');
const { scheduleCreateRules, scheduleUpdateRules, } = require('../validators/scheduleValidator');
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
module.exports = router;
//# sourceMappingURL=scheduleRoutes.js.map