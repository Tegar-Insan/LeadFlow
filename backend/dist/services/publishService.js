"use strict";
const { supabaseAdmin: supabase } = require('../config/supabase');
const { isScheduleTimeReached } = require('../utils/jakartaTime');
let tiktokPublishService = {};
try {
    tiktokPublishService = require('./tiktokPublishService');
}
catch (err) {
    tiktokPublishService = {};
    console.error('[publishService] failed to load tiktokPublishService:', err?.message);
}
const DEFAULT_BATCH_SIZE = 20;
// Only fetch schedules with media already uploaded (status = 'uploaded').
// Schedules in 'scheduled' state have no media yet — publish would fail with "No media asset found".
// Migration 007 trigger advances status draft→scheduled→uploaded on asset insert.
async function getDueSchedules(limit = DEFAULT_BATCH_SIZE) {
    const { data, error } = await supabase
        .from('content_queue_schedules')
        .select('id, scheduled_at, status, auto_publish, tiktok_account_id')
        .eq('status', 'uploaded')
        .eq('auto_publish', true)
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: true })
        .limit(limit);
    if (error)
        throw error;
    return (data || []).filter((row) => isScheduleTimeReached(row.scheduled_at));
}
// Status update and publish log are handled inside tiktokPublishService.finalizePublish
// via the migration 008 DB trigger (trg_publish_log_advance_schedule).
// publishSingle is a thin wrapper — it delegates fully to tiktokPublishService.
async function publishSingle(schedule) {
    if (typeof tiktokPublishService.publishScheduledContent !== 'function') {
        console.error('[publishService] tiktokPublishService.publishScheduledContent is not available');
        return { scheduleId: schedule.id, status: 'failed', reason: 'TikTok publish service not loaded' };
    }
    const result = await tiktokPublishService.publishScheduledContent(schedule.id);
    return {
        scheduleId: schedule.id,
        status: result?.success ? 'published' : 'failed',
        reason: result?.success ? undefined : result?.message,
        publishId: result?.publishId,
        mode: result?.mode,
    };
}
async function runAutoPublishBatch(limit = DEFAULT_BATCH_SIZE) {
    const due = await getDueSchedules(limit);
    const results = [];
    for (const schedule of due) {
        // eslint-disable-next-line no-await-in-loop
        const res = await publishSingle(schedule);
        results.push(res);
    }
    return {
        checked: due.length,
        published: results.filter((r) => r.status === 'published').length,
        failed: results.filter((r) => r.status === 'failed').length,
        results,
    };
}
module.exports = {
    getDueSchedules,
    runAutoPublishBatch,
};
//# sourceMappingURL=publishService.js.map