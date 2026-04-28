/**
 * publicMediaRoutes.ts
 * Public media routes used by TikTok sandbox PULL_FROM_URL
 * LeadFlow – Krench Chicken
 */

import express from 'express';
import * as controller from '../controllers/publicMediaController.ts';

const router = express.Router();

router.get('/media/:assetId', controller.serveMedia);

export default router;