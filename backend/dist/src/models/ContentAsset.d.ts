type AssetRow = Record<string, unknown>;
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
//# sourceMappingURL=ContentAsset.d.ts.map