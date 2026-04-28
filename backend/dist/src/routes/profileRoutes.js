// src/routes/profileRoutes.ts
import express from 'express';
import authMiddleware from "../middleware/authMiddleware.js";
import { getProfile, updateProfile, changePassword, uploadPhoto, deletePhoto, getPhotoHistory, photoUploadMiddleware, } from "../controllers/profileController.js";
const router = express.Router();
router.get('/me', authMiddleware, getProfile);
router.put('/me', authMiddleware, updateProfile);
router.put('/me/password', authMiddleware, changePassword);
router.post('/me/photo', authMiddleware, photoUploadMiddleware, uploadPhoto);
router.delete('/me/photo', authMiddleware, deletePhoto);
router.get('/me/photos', authMiddleware, getPhotoHistory);
export default router;
//# sourceMappingURL=profileRoutes.js.map