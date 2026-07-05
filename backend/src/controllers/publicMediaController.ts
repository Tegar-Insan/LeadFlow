import type { Request, Response } from 'express';
import sharp from 'sharp';
import { supabaseAdmin } from '../config/supabase.ts';
import * as ContentAsset from '../models/ContentAsset.ts';
import { success, error } from '../utils/responseHelper.ts';
import { verifyMediaToken } from '../utils/mediaTokenHelper.ts';
import logger from '../utils/logger.ts';

const STORAGE_BUCKET = process.env['SUPABASE_STORAGE_BUCKET'] ?? 'leadflow-media';

// TikTok's Content Posting API photo endpoint (PULL_FROM_URL) only accepts
// JPEG/WEBP — this is the only route TikTok's servers fetch photo assets
// from, so anything else stored (PNG is the common case — AI-generated
// poster images and most manual uploads) must be converted here rather
// than at upload time, keeping the original file untouched in storage.
const TIKTOK_ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/webp']);

export const serveMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const assetId = req.params['assetId'] as string;
    const token = req.query['token'] as string | undefined;

    if (!token) {
      error(res, { message: 'Missing media token', statusCode: 401 }); return;
    }

    try {
      verifyMediaToken(token, assetId);
    } catch (tokenErr) {
      logger.warn('[publicMediaController] rejected media request — invalid/expired token', { tokenErr, assetId });
      error(res, { message: 'Invalid or expired media token', statusCode: 401 }); return;
    }

    const asset = await ContentAsset.getAssetById(assetId);
    if (!asset || !(asset as { storage_path?: string }).storage_path) {
      error(res, { message: 'Asset not found', statusCode: 404 }); return;
    }

    const { data, error: downloadError } = await supabaseAdmin
      .storage
      .from(STORAGE_BUCKET)
      .download((asset as { storage_path: string }).storage_path);

    if (downloadError || !data) {
      logger.error('[publicMediaController] download failed', downloadError);
      error(res, { message: 'Failed to load media', statusCode: 404 }); return;
    }

    const arrayBuffer = await data.arrayBuffer();
    let buffer: Buffer<ArrayBufferLike> = Buffer.from(arrayBuffer);
    let contentType = (asset as { mime_type?: string }).mime_type ?? data.type ?? 'application/octet-stream';

    if (contentType.startsWith('image/') && !TIKTOK_ACCEPTED_IMAGE_TYPES.has(contentType)) {
      try {
        buffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
        contentType = 'image/jpeg';
      } catch (conversionErr) {
        logger.error('[publicMediaController] image conversion to JPEG failed', conversionErr);
        error(res, { message: 'Failed to convert media for TikTok', statusCode: 500 }); return;
      }
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.status(200).send(buffer);
  } catch (err) {
    logger.error('[publicMediaController.serveMedia]', err);
    error(res, { message: 'Failed to load media', statusCode: 500 });
  }
};
