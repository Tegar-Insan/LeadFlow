import { supabaseAdmin } from '../config/supabase.ts';

type ScheduleRow = Record<string, unknown>;
type AssetRow = Record<string, unknown>;

const _profileMap = async (userIds: string[]): Promise<Record<string, string>> => {
  if (!userIds.length) return {};
  const { data } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, full_name')
    .in('user_id', userIds);
  return Object.fromEntries(
    ((data ?? []) as Array<{ user_id: string; full_name: string }>).map((p) => [p.user_id, p.full_name]),
  );
};

export const getSchedulesByMonth = async (year: number, month: number): Promise<ScheduleRow[]> => {
  const startUTC = new Date(Date.UTC(year, month - 1, 1) - 7 * 3_600_000);
  const endUTC = new Date(Date.UTC(year, month, 1) - 7 * 3_600_000);

  const { data: schedules, error } = await supabaseAdmin
    .from('content_queue_schedules')
    .select('*, content_assets(id, content_type, file_url, mime_type)')
    .gte('scheduled_at', startUTC.toISOString())
    .lt('scheduled_at', endUTC.toISOString())
    .order('scheduled_at', { ascending: true, nullsFirst: false })
    .order('priority_order', { ascending: false });

  if (error) throw error;

  const rows = (schedules ?? []) as Array<ScheduleRow & { created_by?: string; content_assets?: AssetRow[] }>;
  const profiles = await _profileMap(
    [...new Set(rows.map((s) => s.created_by).filter(Boolean) as string[])],
  );

  return rows.map((s) => {
    const assets = (s.content_assets as AssetRow[] | undefined) ?? [];
    const { content_assets, ...rest } = s;
    void content_assets;
    return {
      ...rest,
      created_by_name: profiles[s.created_by as string] ?? null,
      primary_asset_id: (assets[0] as AssetRow | undefined)?.['id'] ?? null,
      primary_asset_type: (assets[0] as AssetRow | undefined)?.['content_type'] ?? null,
      primary_asset_url: (assets[0] as AssetRow | undefined)?.['file_url'] ?? null,
      primary_asset_mime: (assets[0] as AssetRow | undefined)?.['mime_type'] ?? null,
    };
  });
};

export const getDraftSchedules = async (): Promise<ScheduleRow[]> => {
  const { data: schedules, error } = await supabaseAdmin
    .from('content_queue_schedules')
    .select('*, content_assets(id, content_type, file_url, mime_type)')
    .eq('status', 'draft')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (schedules ?? []) as Array<ScheduleRow & { created_by?: string; content_assets?: AssetRow[] }>;
  const profiles = await _profileMap(
    [...new Set(rows.map((s) => s.created_by).filter(Boolean) as string[])],
  );

  return rows.map((s) => {
    const assets = (s.content_assets as AssetRow[] | undefined) ?? [];
    const { content_assets, ...rest } = s;
    void content_assets;
    return {
      ...rest,
      created_by_name: profiles[s.created_by as string] ?? null,
      primary_asset_id:   (assets[0] as AssetRow | undefined)?.['id']           ?? null,
      primary_asset_type: (assets[0] as AssetRow | undefined)?.['content_type'] ?? null,
      primary_asset_url:  (assets[0] as AssetRow | undefined)?.['file_url']     ?? null,
      primary_asset_mime: (assets[0] as AssetRow | undefined)?.['mime_type']    ?? null,
    };
  });
};

export const getScheduleById = async (id: string): Promise<ScheduleRow | null> => {
  const { data: schedule, error } = await supabaseAdmin
    .from('content_queue_schedules')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!schedule) return null;

  const s = schedule as ScheduleRow & { created_by?: string };

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
    ...s,
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

export const moveSchedule = async (id: string, newScheduledAt: string): Promise<ScheduleRow> => {
  const status = newScheduledAt ? 'scheduled' : 'draft';

  const { data: schedule, error } = await supabaseAdmin
    .from('content_queue_schedules')
    .update({ scheduled_at: newScheduledAt, status, updated_at: new Date().toISOString() })
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

export const createAsset = async ({
  queue_schedule_id,
  uploaded_by,
  content_type,
  file_name,
  file_url,
  storage_path,
  mime_type,
  file_size_bytes,
  duration_seconds = null,
}: {
  queue_schedule_id: string;
  uploaded_by: string;
  content_type: string;
  file_name: string;
  file_url: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  duration_seconds?: number | null;
}): Promise<AssetRow> => {
  const { data: asset, error } = await supabaseAdmin
    .from('content_assets')
    .insert({ queue_schedule_id, uploaded_by, content_type, file_name, file_url, storage_path, mime_type, file_size_bytes, duration_seconds })
    .select()
    .single();

  if (error) throw error;
  return asset as AssetRow;
};

export const getAssetsBySchedule = async (scheduleId: string): Promise<AssetRow[]> => {
  const { data, error } = await supabaseAdmin
    .from('content_assets')
    .select('*')
    .eq('queue_schedule_id', scheduleId)
    .order('uploaded_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as AssetRow[];
};

export const getAssetById = async (assetId: string): Promise<AssetRow | null> => {
  const { data, error } = await supabaseAdmin
    .from('content_assets')
    .select('*')
    .eq('id', assetId)
    .maybeSingle();

  if (error) throw error;
  return (data as AssetRow | null) ?? null;
};

export const deleteAsset = async (assetId: string): Promise<AssetRow | null> => {
  const { data: asset, error: fetchErr } = await supabaseAdmin
    .from('content_assets')
    .select('*')
    .eq('id', assetId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!asset) return null;

  const { error } = await supabaseAdmin.from('content_assets').delete().eq('id', assetId);
  if (error) throw error;
  return asset as AssetRow;
};
