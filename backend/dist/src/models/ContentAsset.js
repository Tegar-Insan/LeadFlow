// src/models/ContentAsset.ts
// Business logic moved from services/scheduleService.ts (MVC refactor)
// UC008 Upload Content Feed in Calendar — content_assets CRUD
import { supabaseAdmin } from "../config/supabase.js";
export const createAsset = async ({ queue_schedule_id, uploaded_by, content_type, file_name, file_url, storage_path, mime_type, file_size_bytes, duration_seconds = null, }) => {
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
    if (error)
        throw error;
    return asset;
};
export const getAssetsBySchedule = async (scheduleId) => {
    const { data: assets, error } = await supabaseAdmin
        .from('content_assets')
        .select('*')
        .eq('queue_schedule_id', scheduleId)
        .order('uploaded_at', { ascending: true });
    if (error)
        throw error;
    return (assets ?? []);
};
export const getAssetById = async (assetId) => {
    const { data: asset, error } = await supabaseAdmin
        .from('content_assets')
        .select('*')
        .eq('id', assetId)
        .maybeSingle();
    if (error)
        throw error;
    return asset ?? null;
};
export const deleteAsset = async (assetId) => {
    const asset = await getAssetById(assetId);
    if (!asset)
        return null;
    const { error } = await supabaseAdmin.from('content_assets').delete().eq('id', assetId);
    if (error)
        throw error;
    return asset;
};
//# sourceMappingURL=ContentAsset.js.map