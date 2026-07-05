import { supabaseAdmin as supabase } from '../config/supabase.ts';
import { isScheduleTimeReached } from '../utils/jakartaTime.ts';
import { getErrorMessage } from '../utils/errorHelper.ts';
import * as tiktokPublishService from './tiktokPublishService.ts';

const DEFAULT_BATCH_SIZE = 20;
const PUBLISH_TIMEOUT_MS = 180_000;

type PublishResult = {
  scheduleId: string;
  status: 'published' | 'failed';
  reason?: string | undefined;
  publishId?: string | undefined;
  mode?: string | undefined;
};

type ScheduleRow = {
  id: string;
  scheduled_at: string;
  status: string;
  auto_publish: boolean;
  tiktok_account_id: string | null;
};

export async function getDueSchedules(limit = DEFAULT_BATCH_SIZE): Promise<ScheduleRow[]> {
  const { data, error } = await supabase
    .from('content_queue_schedules')
    .select('id, scheduled_at, status, auto_publish, tiktok_account_id')
    .eq('status', 'uploaded')
    .eq('auto_publish', true)
    .not('scheduled_at', 'is', null)
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as ScheduleRow[]).filter((row) =>
    isScheduleTimeReached(row.scheduled_at)
  );
}

async function publishSingleWithTimeout(schedule: ScheduleRow): Promise<PublishResult> {
  if (typeof tiktokPublishService.publishScheduledContent !== 'function') {
    return { scheduleId: schedule.id, status: 'failed', reason: 'TikTok publish service not loaded' };
  }

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('TikTok publish timeout after 180s')), PUBLISH_TIMEOUT_MS)
  );

  try {
    const result = await Promise.race([
      tiktokPublishService.publishScheduledContent(schedule.id),
      timeoutPromise,
    ]);

    return {
      scheduleId: schedule.id,
      status: result?.success ? 'published' : 'failed',
      reason: result?.success ? undefined : (result?.message as string | undefined),
      publishId: result?.publishId as string | undefined,
      mode: result?.mode as string | undefined,
    };
  } catch (err) {
    return {
      scheduleId: schedule.id,
      status: 'failed',
      reason: getErrorMessage(err),
    };
  }
}

export async function runAutoPublishBatch(limit = DEFAULT_BATCH_SIZE) {
  const due = await getDueSchedules(limit);
  if (due.length === 0) return { checked: 0, published: 0, failed: 0, results: [] };

  const settled = await Promise.allSettled(due.map((s) => publishSingleWithTimeout(s)));

  const results: PublishResult[] = settled.map((outcome, i) => {
    if (outcome.status === 'fulfilled') return outcome.value;
    return {
      scheduleId: due[i]!.id,
      status: 'failed' as const,
      reason: getErrorMessage(outcome.reason),
    };
  });

  return {
    checked: due.length,
    published: results.filter((r) => r.status === 'published').length,
    failed: results.filter((r) => r.status === 'failed').length,
    results,
  };
}
