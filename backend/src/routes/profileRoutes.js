// src/routes/profileRoutes.js
const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getProfile,
  updateProfile,
  changePassword,
  uploadPhoto,
  photoUploadMiddleware,
} = require('../controllers/profileController');

router.get('/me',          authMiddleware, getProfile);
router.put('/me',          authMiddleware, updateProfile);
router.put('/me/password', authMiddleware, changePassword);
router.post('/me/photo',   authMiddleware, photoUploadMiddleware, uploadPhoto);

module.exports = router;
