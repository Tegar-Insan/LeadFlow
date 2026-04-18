/**
 * chatbotRoutes.js
 * POST /api/chatbot/message          — Gemini AI chat (all authenticated users)
 * POST /api/chatbot/approve-schedule — create calendar entry from AI recommendation
 * POST /api/chatbot/reject-schedule  — acknowledge rejection, no DB write
 * LeadFlow — UC Chatbot (AI Assistant)
 */

const express    = require('express');
const router     = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
  sendMessage,
  approveSchedule,
  rejectSchedule,
} = require('../controllers/chatbotController');

// Any authenticated user can chat
router.post('/message', authMiddleware, sendMessage);

// Only marketing_staff can create schedules (approve recommendation)
router.post(
  '/approve-schedule',
  authMiddleware,
  roleMiddleware(['marketing_staff', 'admin']),
  approveSchedule
);

// Any authenticated user can reject
router.post('/reject-schedule', authMiddleware, rejectSchedule);

module.exports = router;
