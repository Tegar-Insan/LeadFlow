/**
 * mediaController.js
 * UC008 – Upload Content Feed in Calendar
 * Uses content_assets table with queue_schedule_id + content_type_enum
 * LeadFlow – Krench Chicken
 */

const multer            = require('multer');
const path              = require('path');
const { randomUUID }    = require('crypto');
const { createClient }  = require('@supabase/supabase-js');
const scheduleService   = require('../services/scheduleService');
const { getConnectedAccountForUser } = require('../services/tiktokOAuthService');
const { TIKTOK_CONFIG } = require('../config/tiktok');
const { success, error } = require('../utils/responseHelper');
const logger            = require('../utils/logger');

const supabaseStorage = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'leadflow-media';

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4',  'video/quicktime', 'video/x-msvideo',
];

const MAX_FILE_SIZE = 52428800; // 50 MB per STD TC008_04

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    ALLOWED_MIME.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  },
  limits: { fileSize: MAX_FILE_SIZE },
});

const uploadMiddleware = upload.array('files', 10);

// Map mime type → content_type_enum value
const getContentType = (mimetype) =>
  mimetype.startsWith('video/') ? 'short_video' : 'poster_photo';

const buildPublicMediaUrl = (assetId) => {
  if (!assetId || !TIKTOK_CONFIG.mediaPublicBaseUrl) return null;
  const base = TIKTOK_CONFIG.mediaPublicBaseUrl.replace(/\/$/, '');
  return `${base}/tiktok/public/media/${assetId}`;
};

// ─────────────────────────────────────────────
// POST /api/media/upload/:scheduleId
// ─────────────────────────────────────────────
const uploadMedia = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const schedule = await scheduleService.getScheduleById(scheduleId);
    if (!schedule) return error(res, { message: 'Schedule not found', statusCode: 404 });
    if (schedule.status === 'published') {
      return error(res, { message: 'Cannot upload to a published schedule', statusCode: 409 });
    }
    if (!req.files || req.files.length === 0) {
      return error(res, { message: 'No files uploaded', statusCode: 400 });
    }

    if (!schedule.tiktok_account_id) {
      const connectedAccount = await getConnectedAccountForUser(req.user.userId);
      if (connectedAccount?.id) {
        const { error: linkError } = await supabaseStorage
          .from('content_queue_schedules')
          .update({
            tiktok_account_id: connectedAccount.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', scheduleId);

        if (linkError) {
          logger.error('[mediaController] Failed to attach TikTok account to schedule', linkError);
          return error(res, {
            message: `Failed to attach TikTok account to schedule: ${linkError.message}`,
            statusCode: 502,
          });
        }

        schedule.tiktok_account_id = connectedAccount.id;
      }
    }

    const uploadAsset = async (file) => {
      const ext         = path.extname(file.originalname) || '.bin';
      const storagePath = `schedules/${scheduleId}/${randomUUID()}${ext}`;

      const { error: storageErr } = await supabaseStorage
        .storage.from(STORAGE_BUCKET)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (storageErr) {
        logger.error('[mediaController] Storage error', storageErr);
        return error(res, { message: `Storage upload failed: ${storageErr.message}`, statusCode: 502 });
      }

      const { data: urlData } = supabaseStorage
        .storage.from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      const asset = await scheduleService.createAsset({
        queue_schedule_id: scheduleId,
        uploaded_by:       req.user.userId,
        content_type:      getContentType(file.mimetype),
        file_name:         file.originalname,
        file_url:          urlData.publicUrl,
        storage_path:      storagePath,
        mime_type:         file.mimetype,
        file_size_bytes:   file.size,
      });

      const publicUrl = buildPublicMediaUrl(asset.id);
      if (publicUrl) {
        await supabaseStorage
          .from('content_assets')
          .update({ file_url: publicUrl })
          .eq('id', asset.id);
        asset.file_url = publicUrl;
      }

      return asset;
    };

    const uploadedAssets = req.files.length === 1
      ? [await uploadAsset(req.files[0])]
      : await Promise.all(req.files.map((file) => uploadAsset(file)));

    logger.info(`[Media] ${req.files.length} file(s) uploaded to schedule ${scheduleId}`);
    return success(res, {
      message: 'Media uploaded',
      data: {
        scheduleId,
        tiktok_account_id: schedule.tiktok_account_id || null,
        assets: uploadedAssets,
      },
      statusCode: 201,
    });
  } catch (err) {
    logger.error('[mediaController.uploadMedia]', err);
    return error(res, { message: 'Media upload failed', statusCode: 500 });
  }
};

// ─────────────────────────────────────────────
// GET /api/media/:scheduleId
// ─────────────────────────────────────────────
const getMediaBySchedule = async (req, res) => {
  try {
    const schedule = await scheduleService.getScheduleById(req.params.scheduleId);
    if (!schedule) return error(res, { message: 'Schedule not found', statusCode: 404 });
    const assets = await scheduleService.getAssetsBySchedule(req.params.scheduleId);
    return success(res, {
      message: 'Assets loaded',
      data: {
        schedule,
        assets,
      },
    });
  } catch (err) {
    logger.error('[mediaController.getMediaBySchedule]', err);
    return error(res, { message: 'Failed to load media', statusCode: 500 });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/media/:assetId
// ─────────────────────────────────────────────
const deleteMedia = async (req, res) => {
  try {
    const asset = await scheduleService.getAssetById(req.params.assetId);
    if (!asset) return error(res, { message: 'Asset not found', statusCode: 404 });

    const schedule = await scheduleService.getScheduleById(asset.queue_schedule_id);
    if (!schedule) return error(res, { message: 'Schedule not found', statusCode: 404 });
    if (schedule.status === 'published') {
      return error(res, {
        message: 'Cannot delete media from a published schedule',
        statusCode: 409,
      });
    }

    await scheduleService.deleteAsset(req.params.assetId);

    const { error: removeError } = await supabaseStorage
      .storage.from(STORAGE_BUCKET)
      .remove([asset.storage_path]);

    if (removeError) {
      logger.error('[mediaController] Storage delete warning', removeError);
    }

    logger.info(`[Media] Asset deleted id=${asset.id}`);
    return success(res, { message: 'Media deleted', data: { assetId: asset.id } });
  } catch (err) {
    logger.error('[mediaController.deleteMedia]', err);
    return error(res, { message: 'Failed to delete media', statusCode: 500 });
  }
};

module.exports = { uploadMiddleware, uploadMedia, getMediaBySchedule, deleteMedia };