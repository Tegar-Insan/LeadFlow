import type { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.ts';
import * as scheduleService from '../services/scheduleService.ts';
import { success, error } from '../utils/responseHelper.ts';
import logger from '../utils/logger.ts';

const STORAGE_BUCKET = process.env['SUPABASE_STORAGE_BUCKET'] ?? 'leadflow-media';

export const serveMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const asset = await scheduleService.getAssetById(req.params['assetId'] as string);
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
    const buffer = Buffer.from(arrayBuffer);
    const contentType = (asset as { mime_type?: string }).mime_type ?? data.type ?? 'application/octet-stream';

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
