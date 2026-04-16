/**
 * chatbotRoutes.js
 * POST /api/chatbot/message — AI chat assistant
 * Protected: any authenticated user (marketing_staff + business_owner)
 * LeadFlow — UC Chatbot (AI Assistant)
 */

const express    = require('express');
const router     = express.Router();
const { sendMessage } = require('../controllers/chatbotController');
const authMiddleware  = require('../middleware/authMiddleware');

// POST /api/chatbot/message
router.post('/message', authMiddleware, sendMessage);

module.exports = router;
