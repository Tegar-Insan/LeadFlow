/**
 * agentRoutes.ts
 * Agentic Mode (PLAN.md §12) — thin proxy routes to ai-analyzer.
 */

import express from 'express';
import * as controller from '../controllers/agentController.ts';
import authMiddleware from '../middleware/authMiddleware.ts';
import roleMiddleware from '../middleware/roleMiddleware.ts';
import { agentRunStatusLimiter } from '../middleware/rateLimiter.ts';

const router = express.Router();

router.use(authMiddleware);
const requireRole = roleMiddleware(['marketing_staff', 'admin']);

router.get ('/settings',      requireRole, controller.getSettings);
router.patch('/settings',     requireRole, controller.patchSettings);
router.post('/trigger',       requireRole, controller.triggerAgent);
router.post('/trigger-today', requireRole, controller.triggerToday);
router.get ('/runs/:runId',   agentRunStatusLimiter, requireRole, controller.getAgentRun);

export default router;
