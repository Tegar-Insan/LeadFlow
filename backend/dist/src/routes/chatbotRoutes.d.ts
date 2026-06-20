/**
 * chatbotRoutes.ts
 * POST /api/chatbot/message                 — AI chat, session-based (all authenticated users)
 * GET  /api/chatbot/sessions                — list caller's chat sessions
 * GET  /api/chatbot/sessions/:sessionId/messages — resume one session's history
 * POST /api/chatbot/approve-schedule        — create calendar entry from AI recommendation
 * POST /api/chatbot/reject-schedule         — acknowledge rejection, no DB write
 * LeadFlow — UC Chatbot (AI Assistant)
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=chatbotRoutes.d.ts.map