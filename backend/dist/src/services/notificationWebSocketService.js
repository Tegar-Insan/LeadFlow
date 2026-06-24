// src/services/notificationWebSocketService.ts
// Pushes persistent notifications (Notification.ts model) live to the owning
// user. Mirrors commentWebSocketService.ts's self-contained init(io) pattern
// but uses a dedicated per-user room (notif:${userId}) joined automatically
// on connect, rather than a per-resource room joined via an explicit event.
import logger from "../utils/logger.js";
class NotificationWebSocketService {
    io = null;
    init(io) {
        this.io = io;
        io.on('connection', (socket) => {
            const userId = socket.handshake.auth.userId;
            if (!userId)
                return;
            const room = `notif:${userId}`;
            socket.join(room);
            logger.info(`[NotificationWS] User ${userId} joined ${room}`);
        });
    }
    broadcastNew(userId, notification) {
        if (!this.io)
            return;
        const room = `notif:${userId}`;
        this.io.to(room).emit('notification:new', notification);
        logger.info(`[NotificationWS] notification ${notification.id} pushed to ${room}`);
    }
}
export default new NotificationWebSocketService();
//# sourceMappingURL=notificationWebSocketService.js.map