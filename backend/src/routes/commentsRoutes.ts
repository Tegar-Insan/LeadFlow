// backend/src/routes/commentsRoutes.ts
// Mounted at /api/comments

import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.ts';
import roleMiddleware from '../middleware/roleMiddleware.ts';
import {
  listComments,
  createComment,
  deleteComment,
} from '../controllers/commentsController.ts';

const router = Router();

router.use(authMiddleware);

// All authenticated roles can read comments (shared calendar)
router.get('/:scheduleId', roleMiddleware(['marketing_staff', 'admin', 'business_owner']), listComments);
// Only marketing staff can post
router.post('/', roleMiddleware(['marketing_staff']), createComment);
// Author or admin can delete
router.delete('/:id', roleMiddleware(['marketing_staff', 'admin']), deleteComment);

export default router;
