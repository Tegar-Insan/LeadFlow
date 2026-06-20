import { supabaseAdmin } from "../config/supabase.js";
import * as ContentAsset from "../models/ContentAsset.js";
import { success, error } from "../utils/responseHelper.js";
import logger from "../utils/logger.js";
const STORAGE_BUCKET = process.env['SUPABASE_STORAGE_BUCKET'] ?? 'leadflow-media';
export const serveMedia = async (req, res) => {
    try {
        const asset = await ContentAsset.getAssetById(req.params['assetId']);
        if (!asset || !asset.storage_path) {
            error(res, { message: 'Asset not found', statusCode: 404 });
            return;
        }
        const { data, error: downloadError } = await supabaseAdmin
            .storage
            .from(STORAGE_BUCKET)
            .download(asset.storage_path);
        if (downloadError || !data) {
            logger.error('[publicMediaController] download failed', downloadError);
            error(res, { message: 'Failed to load media', statusCode: 404 });
            return;
        }
        const arrayBuffer = await data.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = asset.mime_type ?? data.type ?? 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.status(200).send(buffer);
    }
    catch (err) {
        logger.error('[publicMediaController.serveMedia]', err);
        error(res, { message: 'Failed to load media', statusCode: 500 });
    }
};
//# sourceMappingURL=publicMediaController.js.map