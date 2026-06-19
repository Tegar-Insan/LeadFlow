import type { Server as SocketServer } from 'socket.io';
export declare function broadcastCalendarUpdate(io: SocketServer, year: number, month: number): void;
export declare function broadcastCalendarUpdateFromDate(io: SocketServer, scheduledAt: string | null | undefined): void;
//# sourceMappingURL=calendarSocket.d.ts.map