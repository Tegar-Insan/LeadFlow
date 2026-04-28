/**
 * Get all schedules for a given WIB month.
 * WIB = UTC+7, so the calendar month boundaries are shifted by -7h in UTC.
 */
export function getSchedulesByMonth(year: any, month: any): Promise<any[]>;
/**
 * Get all draft schedules (status = 'draft', no scheduled_at).
 */
export function getDraftSchedules(): Promise<any[]>;
/**
 * Get a single schedule by ID, including all its assets.
 */
export function getScheduleById(id: any): Promise<any>;
/**
 * Create a new schedule entry.
 */
export function createSchedule({ idea_id, created_by, title, description, caption, hashtags, scheduled_at, priority, }: {
    idea_id?: null | undefined;
    created_by: any;
    title: any;
    description?: null | undefined;
    caption?: null | undefined;
    hashtags?: never[] | undefined;
    scheduled_at?: null | undefined;
    priority?: number | undefined;
}): Promise<any>;
/**
 * Update editable fields on a schedule.
 */
export function updateSchedule(id: any, updates: any): Promise<any>;
/**
 * Drag-and-drop move — updates scheduled_at and derives new status.
 */
export function moveSchedule(id: any, newScheduledAt: any): Promise<any>;
/**
 * Delete a schedule (cascades to content_assets via DB constraint).
 */
export function deleteSchedule(id: any): Promise<void>;
/**
 * Insert an asset record after Supabase Storage upload.
 */
export function createAsset({ queue_schedule_id, uploaded_by, content_type, file_name, file_url, storage_path, mime_type, file_size_bytes, duration_seconds, }: {
    queue_schedule_id: any;
    uploaded_by: any;
    content_type: any;
    file_name: any;
    file_url: any;
    storage_path: any;
    mime_type: any;
    file_size_bytes: any;
    duration_seconds?: null | undefined;
}): Promise<any>;
/**
 * Get all assets for a schedule, ordered by upload time.
 */
export function getAssetsBySchedule(scheduleId: any): Promise<any[]>;
/**
 * Get a single asset by ID.
 */
export function getAssetById(assetId: any): Promise<any>;
/**
 * Delete an asset record; returns the deleted row so the caller
 * can clean up Supabase Storage.
 */
export function deleteAsset(assetId: any): Promise<any>;
//# sourceMappingURL=scheduleService.d.ts.map