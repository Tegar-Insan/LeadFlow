/**
 * chatbotRoutes.ts
 * POST /api/chatbot/message          — Gemini AI chat (all authenticated users)
 * POST /api/chatbot/approve-schedule — create calendar entry from AI recommendation
 * POST /api/chatbot/reject-schedule  — acknowledge rejection, no DB write
 * LeadFlow — UC Chatbot (AI Assistant)
 */
import express from 'express';
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { sendMessage, approveSchedule, rejectSchedule, generateScheduleAgent, } from "../controllers/chatbotController.js";
const router = express.Router();
// Any authenticated user can chat
router.post('/message', authMiddleware, sendMessage);
// Only marketing_staff can create schedules (approve recommendation)
router.post('/approve-schedule', authMiddleware, roleMiddleware(['marketing_staff', 'admin']), approveSchedule);
// Any authenticated user can reject
router.post('/reject-schedule', authMiddleware, rejectSchedule);
// AI agent schedule generation (non-chat): generate + create in one endpoint
router.post('/agent/generate-schedule', authMiddleware, roleMiddleware(['marketing_staff', 'admin']), generateScheduleAgent);
export default router;
//# sourceMappingURL=chatbotRoutes.js.map