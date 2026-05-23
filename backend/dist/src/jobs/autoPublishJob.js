import cron from 'node-cron';
import { runAutoPublishBatch } from "../services/publishService.js";
let autoPublishTask = null;
export function startAutoPublishJob() {
    if (autoPublishTask)
        return autoPublishTask;
    autoPublishTask = cron.schedule('* * * * *', async () => {
        try {
            const summary = await runAutoPublishBatch(20);
            if (summary.checked > 0) {
                console.log('[autoPublishJob] batch summary:', summary);
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