// src/models/ContentAsset.ts
// Business logic moved from services/scheduleService.ts (MVC refactor)
// UC008 Upload Content Feed in Calendar — content_assets CRUD

import { supabaseAdmin } from '../config/supabase.ts';

type AssetRow = Record<string, unknown>;

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
  is_ai_placeholder = false,
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
  // TRUE only for the AI-generated cover auto-attached at idea approval
  // (see migration 030) — prevents trg_asset_upload_advance_status from
  // prematurely advancing an unscheduled draft to 'uploaded'. Real UC008
  // uploads (mediaController.ts) must never set this.
  is_ai_placeholder?: boolean;
}): Promise<AssetRow> => {
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
      is_ai_placeholder,
    })
    .select()
    .single();

  if (error) throw error;
  return asset as AssetRow;
};

export const getAssetsBySchedule = async (scheduleId: string): Promise<AssetRow[]> => {
  const { data: assets, error } = await supabaseAdmin
    .from('content_assets')
    .select('*')
    .eq('queue_schedule_id', scheduleId)
    .order('uploaded_at', { ascending: true });

  if (error) throw error;
  return (assets ?? []) as AssetRow[];
};

export const getAssetById = async (assetId: string): Promise<AssetRow | null> => {
  const { data: asset, error } = await supabaseAdmin
    .from('content_assets')
    .select('*')
    .eq('id', assetId)
    .maybeSingle();

  if (error) throw error;
  return (asset as AssetRow | null) ?? null;
};

export const deleteAsset = async (assetId: string): Promise<AssetRow | null> => {
  const asset = await getAssetById(assetId);
  if (!asset) return null;

  const { error } = await supabaseAdmin.from('content_assets').delete().eq('id', assetId);
  if (error) throw error;
  return asset;
};
