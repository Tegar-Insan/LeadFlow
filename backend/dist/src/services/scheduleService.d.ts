type ScheduleRow = Record<string, unknown>;
type AssetRow = Record<string, unknown>;
export declare const getSchedulesByMonth: (year: number, month: number) => Promise<ScheduleRow[]>;
export declare const getDraftSchedules: () => Promise<ScheduleRow[]>;
export declare const getScheduleById: (id: string) => Promise<ScheduleRow | null>;
export declare const createSchedule: ({ idea_id, created_by, title, description, caption, hashtags, scheduled_at, priority, }: {
    idea_id?: string | null;
    created_by: string;
    title?: string;
    description?: string | null | undefined;
    caption?: string | null | undefined;
    hashtags?: string[];
    scheduled_at?: string | null;
    priority?: number;
}) => Promise<ScheduleRow>;
export declare const updateSchedule: (id: string, updates: Record<string, unknown>) => Promise<ScheduleRow>;
export declare const moveSchedule: (id: string, newScheduledAt: string) => Promise<ScheduleRow>;
export declare const deleteSchedule: (id: string) => Promise<void>;
export declare const createAsset: ({ queue_schedule_id, uploaded_by, content_type, file_name, file_url, storage_path, mime_type, file_size_bytes, duration_seconds, }: {
    queue_schedule_id: string;
    uploaded_by: string;
    content_type: string;
    file_name: string;
    file_url: string;
    storage_path: string;
    mime_type: string;
    file_size_bytes: number;
    duration_seconds?: number | null;
}) => Promise<AssetRow>;
export declare const getAssetsBySchedule: (scheduleId: string) => Promise<AssetRow[]>;
export declare const getAssetById: (assetId: string) => Promise<AssetRow | null>;
export declare const deleteAsset: (assetId: string) => Promise<AssetRow | null>;
export {};
//# sourceMappingURL=scheduleService.d.ts.map