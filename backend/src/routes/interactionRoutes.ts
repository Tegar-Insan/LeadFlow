// src/routes/interactionRoutes.ts
import express from 'express';
import * as InteractionMessageController from '../controllers/InteractionMessageController.ts';
import authMiddleware from '../middleware/authMiddleware.ts';

const router = express.Router();

/**
 * All routes require authentication
 */
router.use(authMiddleware);

/**
 * GET /api/message
 * Get all conversations for the current user
 */
router.get('/', InteractionMessageController.getConversations);

/**
 * GET /api/message/users/active
 * Get all active users (marketing_staff + business_owner combined)
 * Note: Place this BEFORE /:userId route to avoid treating "users" as userId
 */
router.get('/users/active', InteractionMessageController.getActiveUsers);

/**
 * GET /api/message/unread/count
 * Get unread message count
 * Note: Place this BEFORE /:userId route to avoid treating "unread" as userId
 */
router.get('/unread/count', InteractionMessageController.getUnreadCount);

/**
 * GET /api/message/:userId
 * Get message history with a specific user
 */
router.get('/:userId', InteractionMessageController.getMessages);

/**
 * POST /api/message
 * Send a new message
 */
router.post('/', InteractionMessageController.sendMessage);

/**
 * PUT /api/message/:messageId
 * Update message (mark as read, edit text)
 */
router.put('/:messageId', InteractionMessageController.updateMessage);

/**
 * DELETE /api/message/:messageId
 * Delete a message (sender only)
 */
router.delete('/:messageId', InteractionMessageController.deleteMessage);

export default router;
