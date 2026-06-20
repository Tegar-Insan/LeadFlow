// src/services/notificationWebSocketService.ts
// Pushes persistent notifications (Notification.ts model) live to the owning
// user. Mirrors commentWebSocketService.ts's self-contained init(io) pattern
// but uses a dedicated per-user room (notif:${userId}) joined automatically
// on connect, rather than a per-resource room joined via an explicit event.

import type { Server, Socket } from 'socket.io';
import logger from '../utils/logger.ts';
import type { NotificationRow } from '../models/Notification.ts';

class NotificationWebSocketService {
  private io: Server | null = null;

  init(io: Server): void {
    this.io = io;

    io.on('connection', (socket: Socket) => {
      const userId = socket.handshake.auth.userId as string | undefined;
      if (!userId) return;

      const room = `notif:${userId}`;
      socket.join(room);
      logger.info(`[NotificationWS] User ${userId} joined ${room}`);
    });
  }

  broadcastNew(userId: string, notification: NotificationRow): void {
    if (!this.io) return;
    const room = `notif:${userId}`;
    this.io.to(room).emit('notification:new', notification);
    logger.info(`[NotificationWS] notification ${notification.id} pushed to ${room}`);
  }
}

export default new NotificationWebSocketService();
