import type { Server } from 'socket.io';
import type { NotificationRow } from '../models/Notification.ts';
declare class NotificationWebSocketService {
    private io;
    init(io: Server): void;
    broadcastNew(userId: string, notification: NotificationRow): void;
}
declare const _default: NotificationWebSocketService;
export default _default;
//# sourceMappingURL=notificationWebSocketService.d.ts.map