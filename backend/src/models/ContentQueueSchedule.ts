// src/models/ContentQueueSchedule.ts
// Business logic moved from services/scheduleService.ts (MVC refactor)
// UC007 Manage Content Schedule Queue — calendar CRUD, drag-drop, list-view filters

import { supabaseAdmin } from '../config/supabase.ts';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

type ScheduleRow = Record<string, unknown>;
type AssetRow = Record<string, unknown>;

async function profileMap(userIds: string[]): Promise<Record<string, string>> {
  if (!userIds.length) return {};
  const { data } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, full_name')
    .in('user_id', userIds);
  return Object.fromEntries(
    ((data ?? []) as Array<{ user_id: string; full_name: string }>).map((p) => [p.user_id, p.full_name]),
  );
}

function hydrateWithProfilesAndAssets(
  rows: Array<ScheduleRow & { created_by?: string; content_assets?: AssetRow[]; content_ideas?: any }>,
  profiles: Record<string, string>,
  includeIdea = true,
): ScheduleRow[] {
  return rows.map((s) => {
    const assets = (s.content_assets as AssetRow[] | undefined) ?? [];
    const idea = includeIdea ? ((s.content_ideas as any) ?? {}) : {};
    const { content_assets, content_ideas, ...rest } = s;
    void content_assets;
    void content_ideas;
    return {
      ...rest,
      ...idea,
      created_by_name: profiles[s.created_by as string] ?? null,
      primary_asset_id: (assets[0] as AssetRow | undefined)?.['id'] ?? null,
      primary_asset_type: (assets[0] as AssetRow | undefined)?.['content_type'] ?? null,
      primary_asset_url: (assets[0] as AssetRow | undefined)?.['file_url'] ?? null,
      primary_asset_mime: (assets[0] as AssetRow | undefined)?.['mime_type'] ?? null,
    };
  });
}

export const getSchedulesByMonth = async (year: number, month: number): Promise<ScheduleRow[]> => {
  const startUTC = new Date(Date.UTC(year, month - 1, 1) - 7 * 3_600_000);
  const endUTC = new Date(Date.UTC(year, month, 1) - 7 * 3_600_000);

  const { data: schedules, error } = await supabaseAdmin
    .from('content_queue_schedules')
    .select(`
      *,
      content_assets(id, content_type, file_url, mime_type),
      content_ideas(content_title, tiktok_caption, hashtag, generated_image_url)
    `)
    .gte('scheduled_at', startUTC.toISOString())
    .lt('scheduled_at', endUTC.toISOString())
    .order('scheduled_at', { ascending: true, nullsFirst: false })
    .order('priority_order', { ascending: false });

  if (error) throw error;

  const rows = (schedules ?? []) as Array<ScheduleRow & { created_by?: string; content_assets?: AssetRow[]; content_ideas?: any }>;
  const profiles = await profileMap(
    [...new Set(rows.map((s) => s.created_by).filter(Boolean) as string[])],
  );

  return hydrateWithProfilesAndAssets(rows, profiles);
};

export const getDraftSchedules = async (): Promise<ScheduleRow[]> => {
  const { data: schedules, error } = await supabaseAdmin
    .from('content_queue_schedules')
    .select(`
      *,
      content_assets(id, content_type, file_url, mime_type),
      content_ideas(content_title, tiktok_caption, hashtag, generated_image_url)
    `)
    .eq('status', 'draft')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (schedules ?? []) as Array<ScheduleRow & { created_by?: string; content_assets?: AssetRow[]; content_ideas?: any }>;
  const profiles = await profileMap(
    [...new Set(rows.map((s) => s.created_by).filter(Boolean) as string[])],
  );

  return hydrateWithProfilesAndAssets(rows, profiles);
};

export const getScheduleById = async (id: string): Promise<ScheduleRow | null> => {
  const { data: schedule, error } = await supabaseAdmin
    .from('content_queue_schedules')
    .select('*, content_ideas(content_title, tiktok_caption, hashtag, generated_image_url, category)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!schedule) return null;

  const s = schedule as ScheduleRow & { created_by?: string; content_ideas?: any };
  const idea = s.content_ideas ?? {};
  const { content_ideas, ...rest } = s;
  void content_ideas;

  const [{ data: assets }, { data: profile }] = await Promise.all([
    supabaseAdmin
      .from('content_assets')
      .select('*')
      .eq('queue_schedule_id', id)
      .order('uploaded_at', { ascending: true }),
    supabaseAdmin
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', s.created_by)
      .maybeSingle(),
  ]);

  return {
    ...rest,
    ...idea,
    assets: assets ?? [],
    created_by_name: (profile as { full_name?: string } | null)?.full_name ?? null,
  };
};

export const createSchedule = async ({
  idea_id = null,
  created_by,
  title,
  description = null,
  caption = null,
  hashtags = [],
  scheduled_at = null,
  status = null,
  priority = 0,
  preview_image_url = null,
}: {
  idea_id?: string | null;
  created_by: string;
  title?: string;
  description?: string | null | undefined;
  caption?: string | null | undefined;
  hashtags?: string[];
  scheduled_at?: string | null;
  status?: string | null;
  priority?: number;
  preview_image_url?: string | null;
}): Promise<ScheduleRow> => {
  void description;
  const nextStatus = status || (scheduled_at ? 'scheduled' : 'draft');
  const normalizedScheduledAt = nextStatus === 'draft' ? null : scheduled_at ?? null;

  const payload: Record<string, unknown> = {
    created_by,
    status: nextStatus,
    priority_order: priority,
    scheduled_at: normalizedScheduledAt,
    custom_caption: caption ?? title,
    custom_hashtags: hashtags,
    auto_publish: true,
  };
  if (idea_id) payload['idea_id'] = idea_id;
  if (preview_image_url) payload['preview_image_url'] = preview_image_url;

  const { data: schedule, error } = await supabaseAdmin
    .from('content_queue_schedules')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return schedule as ScheduleRow;
};

export const updateSchedule = async (id: string, updates: Record<string, unknown>): Promise<ScheduleRow> => {
  const fieldMap: Record<string, string> = {
    title: 'custom_caption',
    caption: 'custom_caption',
    hashtags: 'custom_hashtags',
    scheduled_at: 'scheduled_at',
    status: 'status',
    priority: 'priority_order',
    auto_publish: 'auto_publish',
    privacy_level: 'privacy_level',
  };

  const payload: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(fieldMap)) {
    if (updates[key] !== undefined) payload[col] = updates[key];
  }
  if (Object.keys(payload).length === 0) throw new Error('No valid fields to update');

  const { data: schedule, error } = await supabaseAdmin
    .from('content_queue_schedules')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return schedule as ScheduleRow;
};

export const moveSchedule = async (
  id: string,
  newScheduledAt: string,
  currentStatus?: string,
): Promise<ScheduleRow> => {
  // Media already attached (or a prior publish attempt failed) — rescheduling
  // the date/time must not clobber that back to 'scheduled', or the
  // auto-publish cron (which only polls status='uploaded') silently loses
  // eligibility for this row even though the asset is still attached.
  const preserveStatus = currentStatus === 'uploaded' || currentStatus === 'failed';
  const status = preserveStatus ? currentStatus : (newScheduledAt ? 'scheduled' : 'draft');

  const { data: schedule, error } = await supabaseAdmin
    .from('content_queue_schedules')
    .update({ scheduled_at: newScheduledAt, status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return schedule as ScheduleRow;
};

// "Add to Queue" (ListPage draft cards) — always queues for the same
// wall-clock time tomorrow (WIB). Caller (calendarController) is responsible
// for verifying the row is currently a draft before calling this; the model
// itself just performs the move + status flip once that's established.
export const addToQueueNextDay = async (id: string): Promise<ScheduleRow> => {
  const nextScheduledAt = dayjs().tz('Asia/Jakarta').add(1, 'day').toISOString();

  const { data: schedule, error } = await supabaseAdmin
    .from('content_queue_schedules')
    .update({
      scheduled_at: nextScheduledAt,
      status: 'scheduled',
      auto_publish: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return schedule as ScheduleRow;
};

export const deleteSchedule = async (id: string): Promise<void> => {
  const { error } = await supabaseAdmin.from('content_queue_schedules').delete().eq('id', id);
  if (error) throw error;
};

export const getSchedulesForListView = async (
  userId: string,
  filter: 'day' | 'week' | 'month',
  dateStr: string, // YYYY-MM-DD in WIB
): Promise<ScheduleRow[]> => {
  const dateWIB = dayjs(dateStr).tz('Asia/Jakarta');
  let startUTC: string;
  let endUTC: string;

  // Calculate date range based on filter type
  if (filter === 'day') {
    startUTC = dateWIB.startOf('day').utc().toISOString();
    endUTC = dateWIB.endOf('day').utc().toISOString();
  } else if (filter === 'week') {
    startUTC = dateWIB.startOf('week').utc().toISOString();
    endUTC = dateWIB.endOf('week').utc().toISOString();
  } else {
    // 'month' = rolling 30 days
    startUTC = dateWIB.subtract(30, 'day').startOf('day').utc().toISOString();
    endUTC = dateWIB.endOf('day').utc().toISOString();
  }

  const { data: schedules, error } = await supabaseAdmin
    .from('content_queue_schedules')
    .select(`
      *,
      content_assets(id, content_type, file_url, mime_type),
      content_ideas(content_title, tiktok_caption, hashtag, generated_image_url)
    `)
    .eq('created_by', userId)
    .gte('scheduled_at', startUTC)
    .lte('scheduled_at', endUTC)
    .in('status', ['draft', 'uploaded', 'scheduled', 'published', 'failed'])
    .order('scheduled_at', { ascending: false });

  if (error) throw error;

  const rows = (schedules ?? []) as Array<ScheduleRow & { created_by?: string; content_assets?: AssetRow[]; content_ideas?: any }>;
  const profiles = await profileMap(
    [...new Set(rows.map((s) => s.created_by).filter(Boolean) as string[])],
  );

  return hydrateWithProfilesAndAssets(rows, profiles);
};
