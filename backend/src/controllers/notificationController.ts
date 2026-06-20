// backend/src/controllers/notificationController.ts
// Persistent notification center — GET list/unread-count, PUT read/read-all.
// Open to every authenticated role (no roleMiddleware): admin, business_owner,
// and marketing_staff can all receive notifications (UC006/UC009/comments/TikTok).

import type { Response } from 'express';
import * as Notification from '../models/Notification.ts';
import { success, error } from '../utils/responseHelper.ts';
import logger from '../utils/logger.ts';
import type { AuthenticatedRequest } from '../types/index.ts';

// GET /api/notifications?unread=true
export async function listNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    error(res, { message: 'Unauthorized', statusCode: 401 });
    return;
  }

  const onlyUnread = (req.query as { unread?: string }).unread === 'true';

  try {
    const notifications = await Notification.listForUser(userId, { onlyUnread });
    success(res, { message: 'Notifications listed', data: { notifications }, statusCode: 200 });
  } catch (err) {
    logger.error('[notificationController.listNotifications]', { err });
    error(res, { message: 'Failed to fetch notifications', statusCode: 500 });
  }
}

// GET /api/notifications/unread-count
export async function getUnreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    error(res, { message: 'Unauthorized', statusCode: 401 });
    return;
  }

  try {
    const count = await Notification.getUnreadCount(userId);
    success(res, { message: 'Unread count fetched', data: { count }, statusCode: 200 });
  } catch (err) {
    logger.error('[notificationController.getUnreadCount]', { err });
    error(res, { message: 'Failed to fetch unread count', statusCode: 500 });
  }
}

// PUT /api/notifications/:id/read
export async function markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    error(res, { message: 'Unauthorized', statusCode: 401 });
    return;
  }

  const { id } = req.params as { id?: string };
  if (!id) {
    error(res, { message: 'Notification id required', statusCode: 400 });
    return;
  }

  try {
    const notification = await Notification.markAsRead(id, userId);
    success(res, { message: 'Notification marked as read', data: notification, statusCode: 200 });
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode ?? 500;
    logger.error('[notificationController.markAsRead]', { err });
    error(res, {
      message: statusCode === 404 ? 'Notification not found' : 'Failed to mark notification as read',
      statusCode,
    });
  }
}

// PUT /api/notifications/read-all
export async function markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    error(res, { message: 'Unauthorized', statusCode: 401 });
    return;
  }

  try {
    const result = await Notification.markAllAsRead(userId);
    success(res, { message: 'All notifications marked as read', data: result, statusCode: 200 });
  } catch (err) {
    logger.error('[notificationController.markAllAsRead]', { err });
    error(res, { message: 'Failed to mark notifications as read', statusCode: 500 });
  }
}
