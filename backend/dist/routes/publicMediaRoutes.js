"use strict";
/**
 * publicMediaRoutes.js
 * Public media routes used by TikTok sandbox PULL_FROM_URL
 * LeadFlow – Krench Chicken
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/publicMediaController');
router.get('/media/:assetId', controller.serveMedia);
module.exports = router;
//# sourceMappingURL=publicMediaRoutes.js.map