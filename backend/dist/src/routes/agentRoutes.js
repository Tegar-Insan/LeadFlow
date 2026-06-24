/**
 * agentRoutes.ts
 * Agentic Mode (PLAN.md §12) — thin proxy routes to ai-analyzer.
 */
import express from 'express';
import * as controller from "../controllers/agentController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
const router = express.Router();
router.use(authMiddleware);
const requireRole = roleMiddleware(['marketing_staff', 'admin']);
router.post('/trigger', requireRole, controller.triggerAgent);
router.get('/runs/:runId', requireRole, controller.getAgentRun);
export default router;
//# sourceMappingURL=agentRoutes.js.map