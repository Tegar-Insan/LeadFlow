/**
 * publicMediaController.js
 * Public media endpoint for TikTok sandbox PULL_FROM_URL
 * LeadFlow – Krench Chicken
 */

const { supabaseAdmin } = require('../config/supabase');
const scheduleService = require('../services/scheduleService');
const { success, error } = require('../utils/responseHelper');
const logger = require('../utils/logger');

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'leadflow-media';

const serveMedia = async (req, res) => {
  try {
    const asset = await scheduleService.getAssetById(req.params.assetId);
    if (!asset || !asset.storage_path) {
      return error(res, { message: 'Asset not found', statusCode: 404 });
    }

    const { data, error: downloadError } = await supabaseAdmin
      .storage
      .from(STORAGE_BUCKET)
      .download(asset.storage_path);

    if (downloadError || !data) {
      logger.error('[publicMediaController] download failed', downloadError);
      return error(res, { message: 'Failed to load media', statusCode: 404 });
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = asset.mime_type || data.type || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(buffer);
  } catch (err) {
    logger.error('[publicMediaController.serveMedia]', err);
    return error(res, { message: 'Failed to load media', statusCode: 500 });
  }
};

module.exports = { serveMedia };