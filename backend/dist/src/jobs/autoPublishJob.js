import cron from 'node-cron';
import { runAutoPublishBatch } from "../services/publishService.js";
import { broadcastCalendarUpdate } from "../utils/calendarSocket.js";
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(utc);
dayjs.extend(timezone);
let autoPublishTask = null;
export function startAutoPublishJob(io) {
    if (autoPublishTask)
        return autoPublishTask;
    autoPublishTask = cron.schedule('* * * * *', async () => {
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
        }
        catch (err) {
            const detail = err instanceof Error ? err.message : String(err);
            console.error('[autoPublishJob] failed:', detail);
        }
    }, {
        timezone: 'Asia/Jakarta',
        noOverlap: true,
    });
    return autoPublishTask;
}
export function stopAutoPublishJob() {
    if (!autoPublishTask)
        return;
    autoPublishTask.stop();
    autoPublishTask = null;
}
//# sourceMappingURL=autoPublishJob.js.map