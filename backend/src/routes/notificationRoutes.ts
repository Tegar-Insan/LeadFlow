// backend/src/routes/notificationRoutes.ts
// Mounted at /api/notifications
// No roleMiddleware — every authenticated role (admin, business_owner,
// marketing_staff) can have notifications; ownership is enforced in the model.

import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.ts';
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController.ts';

const router = Router();

router.use(authMiddleware);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

export default router;
