import { supabaseAdmin as supabase } from "../config/supabase.js";
import { isScheduleTimeReached } from "../utils/jakartaTime.js";
import * as tiktokPublishService from "./tiktokPublishService.js";
const DEFAULT_BATCH_SIZE = 20;
const PUBLISH_TIMEOUT_MS = 180_000;
export async function getDueSchedules(limit = DEFAULT_BATCH_SIZE) {
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
    return (data ?? []).filter((row) => isScheduleTimeReached(row.scheduled_at));
}
async function publishSingleWithTimeout(schedule) {
    if (typeof tiktokPublishService.publishScheduledContent !== 'function') {
        return { scheduleId: schedule.id, status: 'failed', reason: 'TikTok publish service not loaded' };
    }
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TikTok publish timeout after 180s')), PUBLISH_TIMEOUT_MS));
    try {
        const result = await Promise.race([
            tiktokPublishService.publishScheduledContent(schedule.id),
            timeoutPromise,
        ]);
        return {
            scheduleId: schedule.id,
            status: result?.success ? 'published' : 'failed',
            reason: result?.success ? undefined : result?.message,
            publishId: result?.publishId,
            mode: result?.mode,
        };
    }
    catch (err) {
        return {
            scheduleId: schedule.id,
            status: 'failed',
            reason: err instanceof Error ? err.message : String(err),
        };
    }
}
export async function runAutoPublishBatch(limit = DEFAULT_BATCH_SIZE) {
    const due = await getDueSchedules(limit);
    if (due.length === 0)
        return { checked: 0, published: 0, failed: 0, results: [] };
    const settled = await Promise.allSettled(due.map((s) => publishSingleWithTimeout(s)));
    const results = settled.map((outcome, i) => {
        if (outcome.status === 'fulfilled')
            return outcome.value;
        return {
            scheduleId: due[i].id,
            status: 'failed',
            reason: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
        };
    });
    return {
        checked: due.length,
        published: results.filter((r) => r.status === 'published').length,
        failed: results.filter((r) => r.status === 'failed').length,
        results,
    };
}
//# sourceMappingURL=publishService.js.map