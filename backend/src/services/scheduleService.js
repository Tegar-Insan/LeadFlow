/**
 * scheduleService.js
 * Business logic — content_queue_schedules + content_assets
 * Table names match 006/007 migrations exactly
 * LeadFlow – Krench Chicken
 */

const db = require('../config/db');

// ─────────────────────────────────────────────
// SCHEDULE QUERIES
// ─────────────────────────────────────────────

/**
 * Get all schedules for a given WIB month
 * WIB = UTC+7, so we offset the range by -7h
 */
const getSchedulesByMonth = async (year, month) => {
  const startUTC = new Date(Date.UTC(year, month - 1, 1) - 7 * 60 * 60 * 1000);
  const endUTC   = new Date(Date.UTC(year, month,     1) - 7 * 60 * 60 * 1000);

  const query = `
    SELECT
      cqs.*,
      up.full_name        AS created_by_name,
      ca.id               AS primary_asset_id,
      ca.content_type     AS primary_asset_type,
      ca.file_url         AS primary_asset_url,
      ca.mime_type        AS primary_asset_mime
    FROM content_queue_schedules cqs
    LEFT JOIN user_profiles  up ON up.user_id         = cqs.created_by
    LEFT JOIN content_assets ca ON ca.queue_schedule_id = cqs.id
    WHERE cqs.scheduled_at >= $1
      AND cqs.scheduled_at <  $2
    ORDER BY cqs.scheduled_at ASC NULLS LAST, cqs.priority_order DESC
  `;
  const { rows } = await db.query(query, [startUTC.toISOString(), endUTC.toISOString()]);
  return rows;
};

/**
 * Get all draft schedules (no scheduled_at set)
 */
const getDraftSchedules = async () => {
  const { rows } = await db.query(`
    SELECT cqs.*, up.full_name AS created_by_name
    FROM content_queue_schedules cqs
    LEFT JOIN user_profiles up ON up.user_id = cqs.created_by
    WHERE cqs.status = 'draft'
    ORDER BY cqs.created_at DESC
  `);
  return rows;
};

/**
 * Get single schedule by id with all assets
 */
const getScheduleById = async (id) => {
  const { rows: [schedule] } = await db.query(`
    SELECT cqs.*, up.full_name AS created_by_name
    FROM content_queue_schedules cqs
    LEFT JOIN user_profiles up ON up.user_id = cqs.created_by
    WHERE cqs.id = $1
  `, [id]);
  if (!schedule) return null;

  const { rows: assets } = await db.query(`
    SELECT * FROM content_assets
    WHERE queue_schedule_id = $1
    ORDER BY uploaded_at ASC
  `, [id]);

  return { ...schedule, assets };
};

/**
 * Create a new schedule entry
 */
const createSchedule = async ({
  idea_id       = null,
  created_by,
  title,          // stored as custom_caption for manual posts
  description   = null,
  caption       = null,
  hashtags      = [],
  scheduled_at  = null,
  priority      = 0,
}) => {
  const status = scheduled_at ? 'scheduled' : 'draft';
  const { rows: [schedule] } = await db.query(`
    INSERT INTO content_queue_schedules
      (idea_id, created_by, status, priority_order, scheduled_at,
       custom_caption, custom_hashtags, auto_publish)
    VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE)
    RETURNING *
  `, [idea_id, created_by, status, priority, scheduled_at, caption || title, hashtags]);
  return schedule;
};

/**
 * Update a schedule
 */
const updateSchedule = async (id, updates) => {
  const fieldMap = {
    title:        'custom_caption',
    caption:      'custom_caption',
    hashtags:     'custom_hashtags',
    scheduled_at: 'scheduled_at',
    status:       'status',
    priority:     'priority_order',
    auto_publish: 'auto_publish',
    privacy_level:'privacy_level',
  };

  const fields = [];
  const values = [];
  let   idx    = 1;

  for (const [key, col] of Object.entries(fieldMap)) {
    if (updates[key] !== undefined) {
      fields.push(`${col} = $${idx++}`);
      values.push(updates[key]);
    }
  }

  if (fields.length === 0) throw new Error('No valid fields to update');

  values.push(id);
  const { rows: [schedule] } = await db.query(`
    UPDATE content_queue_schedules
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = $${idx}
    RETURNING *
  `, values);
  return schedule;
};

/**
 * Move schedule to new date (drag & drop)
 */
const moveSchedule = async (id, newScheduledAt) => {
  const { rows: [schedule] } = await db.query(`
    UPDATE content_queue_schedules
    SET scheduled_at = $1,
        status = CASE WHEN $1 IS NULL THEN 'draft' ELSE 'scheduled' END,
        updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `, [newScheduledAt, id]);
  return schedule;
};

/**
 * Delete a schedule (cascades to content_assets)
 */
const deleteSchedule = async (id) => {
  const { rows: [deleted] } = await db.query(
    'DELETE FROM content_queue_schedules WHERE id = $1 RETURNING id',
    [id]
  );
  return deleted;
};

// ─────────────────────────────────────────────
// ASSET QUERIES
// ─────────────────────────────────────────────

/**
 * Insert asset record after Supabase Storage upload
 */
const createAsset = async ({
  queue_schedule_id,
  uploaded_by,
  content_type,     // 'poster_photo' | 'short_video'
  file_name,
  file_url,
  storage_path,
  mime_type,
  file_size_bytes,
  duration_seconds = null,
}) => {
  const { rows: [asset] } = await db.query(`
    INSERT INTO content_assets
      (queue_schedule_id, uploaded_by, content_type, file_name, file_url,
       storage_path, mime_type, file_size_bytes, duration_seconds)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
  `, [
    queue_schedule_id, uploaded_by, content_type, file_name, file_url,
    storage_path, mime_type, file_size_bytes, duration_seconds,
  ]);
  return asset;
};

/**
 * Get all assets for a schedule
 */
const getAssetsBySchedule = async (scheduleId) => {
  const { rows } = await db.query(
    'SELECT * FROM content_assets WHERE queue_schedule_id = $1 ORDER BY uploaded_at ASC',
    [scheduleId]
  );
  return rows;
};

/**
 * Delete an asset record
 */
const deleteAsset = async (assetId) => {
  const { rows: [asset] } = await db.query(
    'SELECT * FROM content_assets WHERE id = $1', [assetId]
  );
  if (!asset) return null;
  await db.query('DELETE FROM content_assets WHERE id = $1', [assetId]);
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