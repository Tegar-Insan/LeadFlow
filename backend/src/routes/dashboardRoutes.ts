import express from 'express';
import authMiddleware from '../middleware/authMiddleware.ts';
import roleMiddleware from '../middleware/roleMiddleware.ts';
import * as dashboardController from '../controllers/dashboardController.ts';

const router = express.Router();

router.use(authMiddleware);

// GET /api/dashboard/calendar?year=&month=
// Business Owner (+ admin) read-only calendar — published/scheduled/uploaded only
router.get(
  '/calendar',
  roleMiddleware(['business_owner', 'admin']),
  dashboardController.getOwnerCalendar,
);

export default router;
