/**
 * scheduleService.js
 * Business logic — content_queue_schedules + content_assets
 * Uses Supabase JS client query builder (not raw SQL / pg driver)
 * Column names match 006/007 migrations exactly
 * LeadFlow – Krench Chicken
 */

const { supabaseAdmin } = require('../config/supabase');

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Fetch a full_name map { userId: fullName } for an array of user IDs.
 * Used to attach created_by_name without a raw JOIN.
 */
const _profileMap = async (userIds) => {
  if (!userIds.length) return {};
  const { data } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, full_name')
    .in('user_id', userIds);
  return Object.fromEntries((data || []).map(p => [p.user_id, p.full_name]));
};

// ─────────────────────────────────────────────
// SCHEDULE QUERIES
// ─────────────────────────────────────────────

/**
 * Get all schedules for a given WIB month.
 * WIB = UTC+7, so the calendar month boundaries are shifted by -7h in UTC.
 */
const getSchedulesByMonth = async (year, month) => {
  const startUTC = new Date(Date.UTC(year, month - 1, 1) - 7 * 3600_000);
  const endUTC   = new Date(Date.UTC(year, month,     1) - 7 * 3600_000);

  const { data: schedules, error } = await supabaseAdmin
    .from('content_queue_schedules')
    .select('*, content_assets(id, content_type, file_url, mime_type)')
    .gte('scheduled_at', startUTC.toISOString())
    .lt('scheduled_at',  endUTC.toISOString())
    .order('scheduled_at',  { ascending: true,  nullsFirst: false })
    .order('priority_order', { ascending: false });

  if (error) throw error;

  const profiles = await _profileMap([...new Set((schedules || []).map(s => s.created_by).filter(Boolean))]);

  return (schedules || []).map(s => {
    const assets = s.content_assets || [];
    const { content_assets, ...rest } = s;
    return {
      ...rest,
      created_by_name:    profiles[s.created_by]    || null,
      primary_asset_id:   assets[0]?.id             || null,
      primary_asset_type: assets[0]?.content_type   || null,
      primary_asset_url:  assets[0]?.file_url        || null,
      primary_asset_mime: assets[0]?.mime_type       || null,
    };
  });
};

/**
 * Get all draft schedules (status = 'draft', no scheduled_at).
 */
const getDraftSchedules = async () => {
  const { data: schedules, error } = await supabaseAdmin
    .from('content_queue_schedules')
    .select('*')
    .eq('status', 'draft')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const profiles = await _profileMap([...new Set((schedules || []).map(s => s.created_by).filter(Boolean))]);

  return (schedules || []).map(s => ({
    ...s,
    created_by_name: profiles[s.created_by] || null,
  }));
};

/**
 * Get a single schedule by ID, including all its assets.
 */
const getScheduleById = async (id) => {
  const { data: schedule, error } = await supabaseAdmin
    .from('content_queue_schedules')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!schedule) return null;

  const [{ data: assets }, { data: profile }] = await Promise.all([
    supabaseAdmin
      .from('content_assets')
      .select('*')
      .eq('queue_schedule_id', id)
      .order('uploaded_at', { ascending: true }),
    supabaseAdmin
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', schedule.created_by)
      .maybeSingle(),
  ]);

  return { ...schedule, assets: assets || [], created_by_name: profile?.full_name || null };
};

/**
 * Create a new schedule entry.
 */
const createSchedule = async ({
  idea_id      = null,
  created_by,
  title,
  description  = null,
  caption      = null,
  hashtags     = [],
  scheduled_at = null,
  priority     = 0,
}) => {
  const status = scheduled_at ? 'scheduled' : 'draft';

  // idea_id is optional — manual calendar posts have no linked idea.
  // Do NOT include it in the payload when null; letting the DB omit the
  // column avoids a NOT NULL violation on rows created without an idea.
  const payload = {
    created_by,
    status,
    priority_order:  priority,
    scheduled_at:    scheduled_at || null,
    custom_caption:  caption || title,
    custom_hashtags: hashtags,
    auto_publish:    true,
  };
  if (idea_id) payload.idea_id = idea_id;

  const { data: schedule, error } = await supabaseAdmin
    .from('content_queue_schedules')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return schedule;
};

/**
 * Update editable fields on a schedule.
 */
const updateSchedule = async (id, updates) => {
  const fieldMap = {
    title:         'custom_caption',
    caption:       'custom_caption',
    hashtags:      'custom_hashtags',
    scheduled_at:  'scheduled_at',
    status:        'status',
    priority:      'priority_order',
    auto_publish:  'auto_publish',
    privacy_level: 'privacy_level',
  };

  const payload = {};
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
  return schedule;
};

/**
 * Drag-and-drop move — updates scheduled_at and derives new status.
 */
const moveSchedule = async (id, newScheduledAt) => {
  const status = newScheduledAt ? 'scheduled' : 'draft';

  const { data: schedule, error } = await supabaseAdmin
    .from('content_queue_schedules')
    .update({ scheduled_at: newScheduledAt, status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return schedule;
};

/**
 * Delete a schedule (cascades to content_assets via DB constraint).
 */
const deleteSchedule = async (id) => {
  const { error } = await supabaseAdmin
    .from('content_queue_schedules')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ─────────────────────────────────────────────
// ASSET QUERIES
// ─────────────────────────────────────────────

/**
 * Insert an asset record after Supabase Storage upload.
 */
const createAsset = async ({
  queue_schedule_id,
  uploaded_by,
  content_type,
  file_name,
  file_url,
  storage_path,
  mime_type,
  file_size_bytes,
  duration_seconds = null,
}) => {
  const { data: asset, error } = await supabaseAdmin
    .from('content_assets')
    .insert({
      queue_schedule_id,
      uploaded_by,
      content_type,
      file_name,
      file_url,
      storage_path,
      mime_type,
      file_size_bytes,
      duration_seconds,
    })
    .select()
    .single();

  if (error) throw error;
  return asset;
};

/**
 * Get all assets for a schedule, ordered by upload time.
 */
const getAssetsBySchedule = async (scheduleId) => {
  const { data, error } = await supabaseAdmin
    .from('content_assets')
    .select('*')
    .eq('queue_schedule_id', scheduleId)
    .order('uploaded_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

/**
 * Delete an asset record; returns the deleted row so the caller
 * can clean up Supabase Storage.
 */
const deleteAsset = async (assetId) => {
  const { data: asset, error: fetchErr } = await supabaseAdmin
    .from('content_assets')
    .select('*')
    .eq('id', assetId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!asset) return null;

  const { error } = await supabaseAdmin
    .from('content_assets')
    .delete()
    .eq('id', assetId);

  if (error) throw error;
  return asset;
};

module.exports = {
  getSchedulesByMonth,
  getDraftSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  moveSchedule,
  deleteSchedule,
  createAsset,
  getAssetsBySchedule,
  deleteAsset,
};
