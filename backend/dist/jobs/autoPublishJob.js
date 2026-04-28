"use strict";
let cronLib = null;
try {
    // eslint-disable-next-line global-require
    cronLib = require('node-cron');
}
catch (_) {
    cronLib = null;
    console.error('[autoPublishJob] node-cron is not installed. Run: npm install node-cron');
}
const { supabaseAdmin } = require('../config/supabase');
const { runAutoPublishBatch } = require('../services/publishService');
let autoPublishTask = null;
async function getDueScheduleCountFromSupabase() {
    const nowUtcISO = new Date().toISOString();
    const { count, error } = await supabaseAdmin
        .from('content_queue_schedules')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'uploaded')
        .eq('auto_publish', true)
        .lte('scheduled_at', nowUtcISO);
    if (error) {
        console.error('[autoPublishJob] due-count query failed:', JSON.stringify(error));
        return 0;
    }
    return count || 0;
}
function startAutoPublishJob() {
    if (autoPublishTask)
        return autoPublishTask;
    if (!cronLib)
        return null;
    autoPublishTask = cronLib.schedule('* * * * *', async () => {
        try {
            const dueCount = await getDueScheduleCountFromSupabase();
            if (dueCount < 1)
                return;
            const summary = await runAutoPublishBatch(20);
            if (summary?.checked > 0) {
                console.log('[autoPublishJob] batch summary:', summary);
            }
        }
        catch (err) {
            const detail = err?.message || JSON.stringify(err) || String(err);
            console.error('[autoPublishJob] failed:', detail);
        }
    }, {
        timezone: 'Asia/Jakarta',
        recoverMissedExecutions: false,
    });
    return autoPublishTask;
}
function stopAutoPublishJob() {
    if (!autoPublishTask)
        return;
    autoPublishTask.stop();
    autoPublishTask = null;
}
module.exports = {
    startAutoPublishJob,
    stopAutoPublishJob,
};
//# sourceMappingURL=autoPublishJob.js.map