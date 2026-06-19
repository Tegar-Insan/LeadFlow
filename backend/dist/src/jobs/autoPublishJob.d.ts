import cron from 'node-cron';
import type { Server as SocketServer } from 'socket.io';
export declare function startAutoPublishJob(io?: SocketServer): cron.ScheduledTask;
export declare function stopAutoPublishJob(): void;
//# sourceMappingURL=autoPublishJob.d.ts.map