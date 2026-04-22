// src/routes/tiktokRoutes.js
// TikTok Login Kit v2 OAuth routes

const router          = require('express').Router();
const authMiddleware  = require('../middleware/authMiddleware');
const roleMiddleware  = require('../middleware/roleMiddleware');
const ctrl            = require('../controllers/tiktokController');

router.get ('/auth-url',   authMiddleware, roleMiddleware(['marketing_staff', 'admin']), ctrl.getAuthUrl);
router.get ('/callback',                                                                  ctrl.handleCallback);
router.get ('/status',     authMiddleware,                                                ctrl.getStatus);
router.post('/disconnect', authMiddleware, roleMiddleware(['marketing_staff', 'admin']), ctrl.disconnect);
router.post(
  '/publish/:scheduleId',
  authMiddleware,
  roleMiddleware(['marketing_staff', 'admin']),
  ctrl.directPublishBySchedule
);

module.exports = router;
