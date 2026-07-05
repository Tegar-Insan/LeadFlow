import cron from 'node-cron';
import type { Server as SocketServer } from 'socket.io';
import { runAutoPublishBatch } from '../services/publishService.ts';
import { broadcastCalendarUpdate } from '../utils/calendarSocket.ts';
import { getErrorMessage } from '../utils/errorHelper.ts';
import logger from '../utils/logger.ts';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);
dayjs.extend(timezone);

let autoPublishTask: ReturnType<typeof cron.schedule> | null = null;

export function startAutoPublishJob(io?: SocketServer) {
  if (autoPublishTask) return autoPublishTask;

  autoPublishTask = cron.schedule(
    '* * * * *',
    async () => {
      try {
        const summary = await runAutoPublishBatch(20);
        if (summary.checked > 0) {
          console.log('[autoPublishJob] batch summary:', summary);
        }
        // Notify connected business owners when any schedule was published
        if (io && summary.published > 0) {
          const now = dayjs().tz('Asia/Jakarta');
          broadcastCalendarUpdate(io, now.year(), now.month() + 1);
        }
      } catch (err) {
        logger.error(`[autoPublishJob] failed: ${getErrorMessage(err)}`, { error: err });
      }
    },
    {
      timezone: 'Asia/Jakarta',
      noOverlap: true,
    },
  );

  return autoPublishTask;
}

export function stopAutoPublishJob() {
  if (!autoPublishTask) return;
  autoPublishTask.stop();
  autoPublishTask = null;
}
