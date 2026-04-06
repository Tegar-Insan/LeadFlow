/**
 * mediaController.js
 * UC008 – Upload Content Feed in Calendar
 * Uses content_assets table with queue_schedule_id + content_type_enum
 * LeadFlow – Krench Chicken
 */

const multer            = require('multer');
const path              = require('path');
const { v4: uuidv4 }    = require('uuid');
const { createClient }  = require('@supabase/supabase-js');
const scheduleService   = require('../services/scheduleService');
const { success, error } = require('../utils/responseHelper');
const logger            = require('../utils/logger');

const supabaseStorage = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'content-assets';

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

// ─────────────────────────────────────────────
// POST /api/media/upload/:scheduleId
// ─────────────────────────────────────────────
const uploadMedia = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const schedule = await scheduleService.getScheduleById(scheduleId);
    if (!schedule) return res.status(404).json(error('Schedule not found'));
    if (schedule.status === 'published') {
      return res.status(409).json(error('Cannot upload to a published schedule'));
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json(error('No files uploaded'));
    }

    const uploadedAssets = [];

    for (const file of req.files) {
      const ext         = path.extname(file.originalname) || '.bin';
      const storagePath = `schedules/${scheduleId}/${uuidv4()}${ext}`;

      const { error: storageErr } = await supabaseStorage
        .storage.from(STORAGE_BUCKET)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (storageErr) {
        logger.error('[mediaController] Storage error', storageErr);
        return res.status(502).json(error(`Storage upload failed: ${storageErr.message}`));
      }

      const { data: urlData } = supabaseStorage
        .storage.from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      const asset = await scheduleService.createAsset({
        queue_schedule_id: scheduleId,
        uploaded_by:       req.user.id,
        content_type:      getContentType(file.mimetype),
        file_name:         file.originalname,
        file_url:          urlData.publicUrl,
        storage_path:      storagePath,
        mime_type:         file.mimetype,
        file_size_bytes:   file.size,
      });

      uploadedAssets.push(asset);
    }

    logger.info(`[Media] ${req.files.length} file(s) uploaded to schedule ${scheduleId}`);
    return res.status(201).json(success('Media uploaded', { assets: uploadedAssets }));
  } catch (err) {
    logger.error('[mediaController.uploadMedia]', err);
    return res.status(500).json(error('Media upload failed'));
  }
};

// ─────────────────────────────────────────────
// GET /api/media/:scheduleId
// ─────────────────────────────────────────────
const getMediaBySchedule = async (req, res) => {
  try {
    const schedule = await scheduleService.getScheduleById(req.params.scheduleId);
    if (!schedule) return res.status(404).json(error('Schedule not found'));
    const assets = await scheduleService.getAssetsBySchedule(req.params.scheduleId);
    return res.status(200).json(success('Assets loaded', { assets }));
  } catch (err) {
    logger.error('[mediaController.getMediaBySchedule]', err);
    return res.status(500).json(error('Failed to load media'));
  }
};

// ─────────────────────────────────────────────
// DELETE /api/media/:assetId
// ─────────────────────────────────────────────
const deleteMedia = async (req, res) => {
  try {
    const asset = await scheduleService.deleteAsset(req.params.assetId);
    if (!asset) return res.status(404).json(error('Asset not found'));

    await supabaseStorage.storage.from(STORAGE_BUCKET).remove([asset.storage_path]);
    logger.info(`[Media] Asset deleted id=${asset.id}`);
    return res.status(200).json(success('Media deleted', { assetId: asset.id }));
  } catch (err) {
    logger.error('[mediaController.deleteMedia]', err);
    return res.status(500).json(error('Failed to delete media'));
  }
};

module.exports = { uploadMiddleware, uploadMedia, getMediaBySchedule, deleteMedia };