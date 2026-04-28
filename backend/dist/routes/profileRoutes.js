"use strict";
// src/routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getProfile, updateProfile, changePassword, uploadPhoto, deletePhoto, getPhotoHistory, photoUploadMiddleware, } = require('../controllers/profileController');
router.get('/me', authMiddleware, getProfile);
router.put('/me', authMiddleware, updateProfile);
router.put('/me/password', authMiddleware, changePassword);
router.post('/me/photo', authMiddleware, photoUploadMiddleware, uploadPhoto);
router.delete('/me/photo', authMiddleware, deletePhoto);
router.get('/me/photos', authMiddleware, getPhotoHistory);
module.exports = router;
//# sourceMappingURL=profileRoutes.js.map