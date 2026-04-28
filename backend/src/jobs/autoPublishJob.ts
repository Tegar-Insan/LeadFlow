// @ts-nocheck
import cron from 'node-cron';
import { supabaseAdmin } from '../config/supabase.ts';
import { runAutoPublishBatch } from '../services/publishService.ts';

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

export function startAutoPublishJob() {
  if (autoPublishTask) return autoPublishTask;

  autoPublishTask = cron.schedule(
    '* * * * *',
    async () => {
      try {
        const dueCount = await getDueScheduleCountFromSupabase();
        if (dueCount < 1) return;

        const summary = await runAutoPublishBatch(20);
        if (summary?.checked > 0) {
          console.log('[autoPublishJob] batch summary:', summary);
        }
      } catch (err) {
        const detail = err?.message || JSON.stringify(err) || String(err);
        console.error('[autoPublishJob] failed:', detail);
      }
    },
    {
      timezone: 'Asia/Jakarta',
      recoverMissedExecutions: false,
    }
  );

  return autoPublishTask;
}

export function stopAutoPublishJob() {
  if (!autoPublishTask) return;
  autoPublishTask.stop();
  autoPublishTask = null;
}