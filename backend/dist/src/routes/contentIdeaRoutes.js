// backend/src/routes/contentIdeaRoutes.ts
// Mounted at /api/content
import { Router } from 'express';
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { generate, generateWithSteps, listPending } from "../controllers/contentIdeaController.js";
import { approveIdea, rejectIdea, } from "../controllers/IdeaValidationController.js";
const router = Router();
// All content endpoints require authentication
router.use(authMiddleware);
// Marketing staff and admin can generate / approve / reject
router.post('/generate', roleMiddleware(['marketing_staff', 'admin']), generate);
router.post('/generate/process', roleMiddleware(['marketing_staff', 'admin']), generateWithSteps);
router.get('/pending', roleMiddleware(['marketing_staff', 'admin']), listPending);
router.post('/:ideaId/approve', roleMiddleware(['marketing_staff', 'admin']), approveIdea);
router.post('/:ideaId/reject', roleMiddleware(['marketing_staff', 'admin']), rejectIdea);
export default router;
//# sourceMappingURL=contentIdeaRoutes.js.map