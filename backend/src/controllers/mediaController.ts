/**
 * mediaController.ts
 * UC008 – Upload Content Feed in Calendar
 * Uses content_assets table with queue_schedule_id + content_type_enum
 * LeadFlow – Krench Chicken
 */

import type { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../config/supabase.ts';
import * as ContentQueueSchedule from '../models/ContentQueueSchedule.ts';
import * as ContentAsset from '../models/ContentAsset.ts';
import { getConnectedAccountForUser } from '../services/tiktokOAuthService.ts';
import { success, error } from '../utils/responseHelper.ts';
import logger from '../utils/logger.ts';
import type { AuthenticatedRequest } from '../types/index.ts';

const STORAGE_BUCKET = process.env['SUPABASE_STORAGE_BUCKET'] || 'leadflow-media';

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4',  'video/quicktime', 'video/x-msvideo',
];

const MAX_FILE_SIZE = 52428800; // 50 MB per STD TC008_04

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    ALLOWED_MIME.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
  limits: { fileSize: MAX_FILE_SIZE },
});

export const uploadMiddleware = upload.array('files', 10);

// Map mime type → content_type_enum value
const getContentType = (mimetype: string): 'short_video' | 'poster_photo' =>
  mimetype.startsWith('video/') ? 'short_video' : 'poster_photo';

type AssetRow = Record<string, unknown>;

const hydrateAssetPreview = (asset: AssetRow | null): AssetRow | null => {
  if (!asset) return asset;

  let previewUrl = (asset['preview_url'] as string | null) ?? (asset['file_url'] as string | null) ?? null;
  const storagePath = asset['storage_path'] as string | undefined;
  if (storagePath) {
    const { data } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    previewUrl = data?.publicUrl || previewUrl;
  }

  return {
    ...asset,
    file_url: previewUrl,
    preview_url: previewUrl,
  };
};

// ─────────────────────────────────────────────
// POST /api/media/upload/:scheduleId
// ─────────────────────────────────────────────
export const uploadMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.userId;
    if (!userId) { error(res, { message: 'Unauthorized', statusCode: 401 }); return; }

    const { scheduleId } = req.params as { scheduleId: string };

    const schedule = await ContentQueueSchedule.getScheduleById(scheduleId);
    if (!schedule) { error(res, { message: 'Schedule not found', statusCode: 404 }); return; }
    if (schedule['status'] === 'published') {
      error(res, { message: 'Cannot upload to a published schedule', statusCode: 409 }); return;
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      error(res, { message: 'No files uploaded', statusCode: 400 }); return;
    }

    let tiktokAccountId = schedule['tiktok_account_id'] as string | null;
    if (!tiktokAccountId) {
      const connectedAccount = await getConnectedAccountForUser(userId);
      const connectedId = connectedAccount?.['id'] as string | undefined;
      if (connectedId) {
        const { error: linkError } = await supabaseAdmin
          .from('content_queue_schedules')
          .update({
            tiktok_account_id: connectedId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', scheduleId);

        if (linkError) {
          logger.error('[mediaController] Failed to attach TikTok account to schedule', linkError);
          error(res, {
            message: `Failed to attach TikTok account to schedule: ${linkError.message}`,
            statusCode: 502,
          });
          return;
        }

        tiktokAccountId = connectedId;
      }
    }

    const uploadAsset = async (file: Express.Multer.File): Promise<AssetRow | null> => {
      const ext         = path.extname(file.originalname) || '.bin';
      const storagePath = `schedules/${scheduleId}/${randomUUID()}${ext}`;

      const { error: storageErr } = await supabaseAdmin
        .storage.from(STORAGE_BUCKET)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (storageErr) {
        logger.error('[mediaController] Storage error', storageErr);
        throw new Error(`Storage upload failed: ${storageErr.message}`);
      }

      const { data: urlData } = supabaseAdmin
        .storage.from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      const asset = await ContentAsset.createAsset({
        queue_schedule_id: scheduleId,
        uploaded_by:       userId,
        content_type:      getContentType(file.mimetype),
        file_name:         file.originalname,
        file_url:          urlData.publicUrl,
        storage_path:      storagePath,
        mime_type:         file.mimetype,
        file_size_bytes:   file.size,
      });

      return hydrateAssetPreview(asset);
    };

    const uploadedAssets = files.length === 1
      ? [await uploadAsset(files[0] as Express.Multer.File)]
      : await Promise.all(files.map((file) => uploadAsset(file)));

    logger.info(`[Media] ${files.length} file(s) uploaded to schedule ${scheduleId}`);
    success(res, {
      message: 'Media uploaded',
      data: {
        scheduleId,
        tiktok_account_id: tiktokAccountId || null,
        assets: uploadedAssets,
      },
      statusCode: 201,
    });
  } catch (err) {
    logger.error('[mediaController.uploadMedia]', err);
    error(res, { message: 'Media upload failed', statusCode: 500 });
  }
};

// ─────────────────────────────────────────────
// GET /api/media/:scheduleId
// ─────────────────────────────────────────────
export const getMediaBySchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scheduleId } = req.params as { scheduleId: string };
    const schedule = await ContentQueueSchedule.getScheduleById(scheduleId);
    if (!schedule) { error(res, { message: 'Schedule not found', statusCode: 404 }); return; }
    const assets = await ContentAsset.getAssetsBySchedule(scheduleId);
    const hydratedAssets = assets.map(hydrateAssetPreview);
    const scheduleAssets = (schedule['assets'] as AssetRow[] | undefined) ?? [];
    const hydratedSchedule = {
      ...schedule,
      assets: scheduleAssets.map(hydrateAssetPreview),
    };
    success(res, {
      message: 'Assets loaded',
      data: {
        schedule: hydratedSchedule,
        assets: hydratedAssets,
      },
    });
  } catch (err) {
    logger.error('[mediaController.getMediaBySchedule]', err);
    error(res, { message: 'Failed to load media', statusCode: 500 });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/media/:assetId
// ─────────────────────────────────────────────
export const deleteMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const { assetId } = req.params as { assetId: string };
    const asset = await ContentAsset.getAssetById(assetId);
    if (!asset) { error(res, { message: 'Asset not found', statusCode: 404 }); return; }

    const queueScheduleId = asset['queue_schedule_id'] as string;
    const schedule = await ContentQueueSchedule.getScheduleById(queueScheduleId);
    if (!schedule) { error(res, { message: 'Schedule not found', statusCode: 404 }); return; }
    if (schedule['status'] === 'published') {
      error(res, {
        message: 'Cannot delete media from a published schedule',
        statusCode: 409,
      });
      return;
    }

    await ContentAsset.deleteAsset(assetId);

    const storagePath = asset['storage_path'] as string;
    const { error: removeError } = await supabaseAdmin
      .storage.from(STORAGE_BUCKET)
      .remove([storagePath]);

    if (removeError) {
      logger.error('[mediaController] Storage delete warning', removeError);
    }

    logger.info(`[Media] Asset deleted id=${asset['id']}`);
    success(res, { message: 'Media deleted', data: { assetId: asset['id'] } });
  } catch (err) {
    logger.error('[mediaController.deleteMedia]', err);
    error(res, { message: 'Failed to delete media', statusCode: 500 });
  }
};
