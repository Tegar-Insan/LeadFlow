// src/routes/tiktokRoutes.ts
// TikTok Login Kit v2 OAuth routes
import express from 'express';
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import * as ctrl from "../controllers/tiktokController.js";
const router = express.Router();
router.get('/auth-url', authMiddleware, roleMiddleware(['marketing_staff', 'admin']), ctrl.getAuthUrl);
router.get('/callback', ctrl.handleCallback);
router.get('/status', authMiddleware, ctrl.getStatus);
router.post('/disconnect', authMiddleware, roleMiddleware(['marketing_staff', 'admin']), ctrl.disconnect);
router.post('/publish/:scheduleId', authMiddleware, roleMiddleware(['marketing_staff', 'admin']), ctrl.directPublishBySchedule);
export default router;
//# sourceMappingURL=tiktokRoutes.js.map