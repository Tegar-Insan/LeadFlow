"use strict";
/**
 * calendarRoutes.js
 * Routes for Content Calendar (UC007)
 * LeadFlow – Krench Chicken
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/calendarController');
// ── Safe middleware import (handles multiple naming conventions) ───────────
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const verifyToken = authMiddleware.verifyToken ||
    authMiddleware.authenticate ||
    authMiddleware.protect ||
    authMiddleware.authenticateToken ||
    (typeof authMiddleware === 'function' ? authMiddleware : null);
if (!verifyToken) {
    throw new Error('[calendarRoutes] JWT middleware not found. Check authMiddleware exports.');
}
const requireRole = roleMiddleware.requireRole ||
    roleMiddleware.authorize ||
    roleMiddleware.checkRole ||
    roleMiddleware.roleGuard ||
    (typeof roleMiddleware === 'function' ? roleMiddleware : null);
if (!requireRole) {
    throw new Error('[calendarRoutes] Role middleware not found. Check roleMiddleware exports.');
}
const { scheduleCreateRules, scheduleUpdateRules } = require('../validators/scheduleValidator');
// All calendar routes require auth
router.use(verifyToken);
// ─── READ (marketing_staff + business_owner + admin) ───────────────
router.get('/', requireRole(['marketing_staff', 'business_owner', 'admin']), controller.getCalendarByMonth);
router.get('/drafts', requireRole(['marketing_staff', 'business_owner', 'admin']), controller.getDrafts);
router.get('/:id', requireRole(['marketing_staff', 'business_owner', 'admin']), controller.getScheduleById);
// ─── WRITE (marketing_staff + admin only) ──────────────────────────
router.post('/', requireRole(['marketing_staff', 'admin']), scheduleCreateRules, controller.createSchedule);
router.put('/:id', requireRole(['marketing_staff', 'admin']), scheduleUpdateRules, controller.updateSchedule);
// Drag & Drop move
router.patch('/:id/move', requireRole(['marketing_staff', 'admin']), controller.moveSchedule);
router.delete('/:id', requireRole(['marketing_staff', 'admin']), controller.deleteSchedule);
module.exports = router;
//# sourceMappingURL=calendarRoutes.js.map