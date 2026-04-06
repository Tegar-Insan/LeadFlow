/**
 * mediaRoutes.js
 * Routes for Media Upload (UC008)
 * LeadFlow – Krench Chicken
 */

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/mediaController');

// ── Safe middleware import ────────────────────────────────────────────────
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const verifyToken =
  authMiddleware.verifyToken        ||
  authMiddleware.authenticate       ||
  authMiddleware.protect            ||
  authMiddleware.authenticateToken  ||
  (typeof authMiddleware === 'function' ? authMiddleware : null);

const requireRole =
  roleMiddleware.requireRole  ||
  roleMiddleware.authorize    ||
  roleMiddleware.checkRole    ||
  roleMiddleware.roleGuard    ||
  (typeof roleMiddleware === 'function' ? roleMiddleware : null);

if (!verifyToken || !requireRole) {
  throw new Error('[mediaRoutes] Middleware not found — check authMiddleware / roleMiddleware exports.');
}

router.use(verifyToken);

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

module.exports = router;