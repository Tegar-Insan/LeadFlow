import { supabaseAdmin } from "../config/supabase.js";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
dayjs.extend(utc);
dayjs.extend(timezone);
const _profileMap = async (userIds) => {
    if (!userIds.length)
        return {};
    const { data } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
    return Object.fromEntries((data ?? []).map((p) => [p.user_id, p.full_name]));
};
export const getSchedulesByMonth = async (year, month) => {
    const startUTC = new Date(Date.UTC(year, month - 1, 1) - 7 * 3_600_000);
    const endUTC = new Date(Date.UTC(year, month, 1) - 7 * 3_600_000);
    const { data: schedules, error } = await supabaseAdmin
        .from('content_queue_schedules')
        .select(`
      *,
      content_assets(id, content_type, file_url, mime_type),
      content_ideas(content_title, tiktok_caption, hashtag)
    `)
        .gte('scheduled_at', startUTC.toISOString())
        .lt('scheduled_at', endUTC.toISOString())
        .order('scheduled_at', { ascending: true, nullsFirst: false })
        .order('priority_order', { ascending: false });
    if (error)
        throw error;
    const rows = (schedules ?? []);
    const profiles = await _profileMap([...new Set(rows.map((s) => s.created_by).filter(Boolean))]);
    return rows.map((s) => {
        const assets = s.content_assets ?? [];
        const idea = s.content_ideas ?? {};
        const { content_assets, content_ideas, ...rest } = s;
        void content_assets;
        void content_ideas;
        return {
            ...rest,
            ...idea,
            created_by_name: profiles[s.created_by] ?? null,
            primary_asset_id: assets[0]?.['id'] ?? null,
            primary_asset_type: assets[0]?.['content_type'] ?? null,
            primary_asset_url: assets[0]?.['file_url'] ?? null,
            primary_asset_mime: assets[0]?.['mime_type'] ?? null,
        };
    });
};
export const getDraftSchedules = async () => {
    const { data: schedules, error } = await supabaseAdmin
        .from('content_queue_schedules')
        .select(`
      *,
      content_assets(id, content_type, file_url, mime_type),
      content_ideas(content_title, tiktok_caption, hashtag)
    `)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    const rows = (schedules ?? []);
    const profiles = await _profileMap([...new Set(rows.map((s) => s.created_by).filter(Boolean))]);
    return rows.map((s) => {
        const assets = s.content_assets ?? [];
        const idea = s.content_ideas ?? {};
        const { content_assets, content_ideas, ...rest } = s;
        void content_assets;
        void content_ideas;
        return {
            ...rest,
            ...idea,
            created_by_name: profiles[s.created_by] ?? null,
            primary_asset_id: assets[0]?.['id'] ?? null,
            primary_asset_type: assets[0]?.['content_type'] ?? null,
            primary_asset_url: assets[0]?.['file_url'] ?? null,
            primary_asset_mime: assets[0]?.['mime_type'] ?? null,
        };
    });
};
export const getScheduleById = async (id) => {
    const { data: schedule, error } = await supabaseAdmin
        .from('content_queue_schedules')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error)
        throw error;
    if (!schedule)
        return null;
    const s = schedule;
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
        created_by_name: profile?.full_name ?? null,
    };
};
export const createSchedule = async ({ idea_id = null, created_by, title, description = null, caption = null, hashtags = [], scheduled_at = null, status = null, priority = 0, }) => {
    void description;
    const nextStatus = status || (scheduled_at ? 'scheduled' : 'draft');
    const normalizedScheduledAt = nextStatus === 'draft' ? null : scheduled_at ?? null;
    const payload = {
        created_by,
        status: nextStatus,
        priority_order: priority,
        scheduled_at: normalizedScheduledAt,
        custom_caption: caption ?? title,
        custom_hashtags: hashtags,
        auto_publish: true,
    };
    if (idea_id)
        payload['idea_id'] = idea_id;
    const { data: schedule, error } = await supabaseAdmin
        .from('content_queue_schedules')
        .insert(payload)
        .select()
        .single();
    if (error)
        throw error;
    return schedule;
};
export const updateSchedule = async (id, updates) => {
    const fieldMap = {
        title: 'custom_caption',
        caption: 'custom_caption',
        hashtags: 'custom_hashtags',
        scheduled_at: 'scheduled_at',
        status: 'status',
        priority: 'priority_order',
        auto_publish: 'auto_publish',
        privacy_level: 'privacy_level',
    };
    const payload = {};
    for (const [key, col] of Object.entries(fieldMap)) {
        if (updates[key] !== undefined)
            payload[col] = updates[key];
    }
    if (Object.keys(payload).length === 0)
        throw new Error('No valid fields to update');
    const { data: schedule, error } = await supabaseAdmin
        .from('content_queue_schedules')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error)
        throw error;
    return schedule;
};
export const moveSchedule = async (id, newScheduledAt) => {
    const status = newScheduledAt ? 'scheduled' : 'draft';
    const { data: schedule, error } = await supabaseAdmin
        .from('content_queue_schedules')
        .update({ scheduled_at: newScheduledAt, status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error)
        throw error;
    return schedule;
};
export const deleteSchedule = async (id) => {
    const { error } = await supabaseAdmin.from('content_queue_schedules').delete().eq('id', id);
    if (error)
        throw error;
};
export const createAsset = async ({ queue_schedule_id, uploaded_by, content_type, file_name, file_url, storage_path, mime_type, file_size_bytes, duration_seconds = null, }) => {
    const { data: asset, error } = await supabaseAdmin
        .from('content_assets')
        .insert({ queue_schedule_id, uploaded_by, content_type, file_name, file_url, storage_path, mime_type, file_size_bytes, duration_seconds })
        .select()
        .single();
    if (error)
        throw error;
    return asset;
};
export const getAssetsBySchedule = async (scheduleId) => {
    const { data, error } = await supabaseAdmin
        .from('content_assets')
        .select('*')
        .eq('queue_schedule_id', scheduleId)
        .order('uploaded_at', { ascending: true });
    if (error)
        throw error;
    return (data ?? []);
};
export const getAssetById = async (assetId) => {
    const { data, error } = await supabaseAdmin
        .from('content_assets')
        .select('*')
        .eq('id', assetId)
        .maybeSingle();
    if (error)
        throw error;
    return data ?? null;
};
export const deleteAsset = async (assetId) => {
    const { data: asset, error: fetchErr } = await supabaseAdmin
        .from('content_assets')
        .select('*')
        .eq('id', assetId)
        .maybeSingle();
    if (fetchErr)
        throw fetchErr;
    if (!asset)
        return null;
    const { error } = await supabaseAdmin.from('content_assets').delete().eq('id', assetId);
    if (error)
        throw error;
    return asset;
};
export const getSchedulesForListView = async (userId, filter, dateStr) => {
    const dateWIB = dayjs(dateStr).tz('Asia/Jakarta');
    let startUTC;
    let endUTC;
    // Calculate date range based on filter type
    if (filter === 'day') {
        startUTC = dateWIB.startOf('day').utc().toISOString();
        endUTC = dateWIB.endOf('day').utc().toISOString();
    }
    else if (filter === 'week') {
        startUTC = dateWIB.startOf('week').utc().toISOString();
        endUTC = dateWIB.endOf('week').utc().toISOString();
    }
    else {
        // 'month' = rolling 30 days
        startUTC = dateWIB.subtract(30, 'day').startOf('day').utc().toISOString();
        endUTC = dateWIB.endOf('day').utc().toISOString();
    }
    const { data: schedules, error } = await supabaseAdmin
        .from('content_queue_schedules')
        .select('*, content_assets(id, content_type, file_url, mime_type)')
        .eq('created_by', userId)
        .gte('scheduled_at', startUTC)
        .lte('scheduled_at', endUTC)
        .in('status', ['draft', 'uploaded', 'scheduled', 'published', 'failed'])
        .order('scheduled_at', { ascending: false });
    if (error)
        throw error;
    const rows = (schedules ?? []);
    const profiles = await _profileMap([...new Set(rows.map((s) => s.created_by).filter(Boolean))]);
    return rows.map((s) => {
        const assets = s.content_assets ?? [];
        const { content_assets, ...rest } = s;
        void content_assets;
        return {
            ...rest,
            created_by_name: profiles[s.created_by] ?? null,
            primary_asset_id: assets[0]?.['id'] ?? null,
            primary_asset_type: assets[0]?.['content_type'] ?? null,
            primary_asset_url: assets[0]?.['file_url'] ?? null,
            primary_asset_mime: assets[0]?.['mime_type'] ?? null,
        };
    });
};
//# sourceMappingURL=scheduleService.js.map