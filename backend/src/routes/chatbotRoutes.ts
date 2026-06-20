/**
 * chatbotRoutes.ts
 * POST /api/chatbot/message                 — AI chat, session-based (all authenticated users)
 * GET  /api/chatbot/sessions                — list caller's chat sessions
 * GET  /api/chatbot/sessions/:sessionId/messages — resume one session's history
 * POST /api/chatbot/approve-schedule        — create calendar entry from AI recommendation
 * POST /api/chatbot/reject-schedule         — acknowledge rejection, no DB write
 * LeadFlow — UC Chatbot (AI Assistant)
 */

import express from 'express';
import authMiddleware from '../middleware/authMiddleware.ts';
import roleMiddleware from '../middleware/roleMiddleware.ts';
import {
  sendMessage,
  getSessions,
  getSessionMessages,
  approveSchedule,
  rejectSchedule,
  generateScheduleAgent,
} from '../controllers/chatbotController.ts';

const router = express.Router();

// Any authenticated user can chat
router.post('/message', authMiddleware, sendMessage);

// Session history — long-term memory resume
router.get('/sessions', authMiddleware, getSessions);
router.get('/sessions/:sessionId/messages', authMiddleware, getSessionMessages);

// Only marketing_staff can create schedules (approve recommendation)
router.post(
  '/approve-schedule',
  authMiddleware,
  roleMiddleware(['marketing_staff', 'admin']),
  approveSchedule
);

// Any authenticated user can reject
router.post('/reject-schedule', authMiddleware, rejectSchedule);

// AI agent schedule generation (non-chat): generate + create in one endpoint
router.post(
  '/agent/generate-schedule',
  authMiddleware,
  roleMiddleware(['marketing_staff', 'admin']),
  generateScheduleAgent
);

export default router;
