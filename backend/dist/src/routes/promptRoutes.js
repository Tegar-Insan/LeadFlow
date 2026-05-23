// backend/src/routes/promptRoutes.ts
// Mounted at /api/prompt — read-only view of the user's past prompts + their ideas.
import { Router } from 'express';
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { listMyPrompts, getPromptDetail } from "../controllers/promptController.js";
const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware(['marketing_staff', 'admin']));
router.get('/mine', listMyPrompts);
router.get('/:promptId', getPromptDetail);
export default router;
//# sourceMappingURL=promptRoutes.js.map