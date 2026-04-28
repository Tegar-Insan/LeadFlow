// @ts-nocheck
// src/controllers/profileController.ts
// CRUD for own profile: read, update name/phone, change password, upload/delete photo.
// Photo records are stored in user_photos table; profile_photo_url in user_profiles
// is kept in sync for backward compatibility.
import path from 'path';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import * as User from "../models/User.js";
import * as UserProfile from "../models/UserProfile.js";
import * as UserPhoto from "../models/UserPhoto.js";
import { hashPassword, comparePassword } from "../utils/passwordHelper.js";
import { success, error } from "../utils/responseHelper.js";
import logger from "../utils/logger.js";
// ── Supabase storage client ───────────────────────────────────────────────────
const supabaseStorage = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PHOTO_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'leadflow-media';
// ── Multer — images only, 5 MB cap ───────────────────────────────────────────
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const photoUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (_req, file, cb) => ALLOWED_IMAGE_MIME.includes(file.mimetype)
        ? cb(null, true)
        : cb(new Error('Only JPEG, PNG or WEBP images are allowed'), false),
    limits: { fileSize: 5 * 1024 * 1024 },
});
export const photoUploadMiddleware = photoUpload.single('photo');
// ── GET /api/profile/me ───────────────────────────────────────────────────────
export async function getProfile(req, res) {
    try {
        const user = await User.findById(req.user.userId);
        if (!user)
            return error(res, { message: 'User not found', statusCode: 404 });
        const profile = await UserProfile.findByUserId(req.user.userId);
        const activePhoto = await UserPhoto.findActiveByUserId(req.user.userId);
        return success(res, {
            message: 'Profile fetched',
            data: {
                id: user.id,
                email: user.email,
                fullName: profile?.full_name || null,
                phone: profile?.phone || null,
                photoUrl: activePhoto?.photo_url || profile?.profile_photo_url || null,
                roleName: user.roles?.name || null,
                isActive: user.is_active,
            },
        });
    }
    catch (err) {
        logger.error('[profileController.getProfile]', err);
        return error(res, { message: err.message, statusCode: 500 });
    }
}
// ── PUT /api/profile/me ───────────────────────────────────────────────────────
export async function updateProfile(req, res) {
    try {
        const { fullName, phone } = req.body;
        const updates = {};
        if (fullName !== undefined)
            updates.fullName = fullName.trim();
        if (phone !== undefined)
            updates.phone = phone.trim() || null;
        if (Object.keys(updates).length === 0) {
            return error(res, { message: 'No fields to update', statusCode: 400 });
        }
        const profile = await UserProfile.update(req.user.userId, updates);
        return success(res, {
            message: 'Profile updated',
            data: {
                fullName: profile.full_name,
                phone: profile.phone,
            },
        });
    }
    catch (err) {
        logger.error('[profileController.updateProfile]', err);
        return error(res, { message: err.message, statusCode: 500 });
    }
}
// ── PUT /api/profile/me/password ─────────────────────────────────────────────
export async function changePassword(req, res) {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return error(res, { message: 'currentPassword and newPassword are required', statusCode: 400 });
        }
        if (newPassword.length < 8) {
            return error(res, { message: 'New password must be at least 8 characters', statusCode: 400 });
        }
        const user = await User.findById(req.user.userId);
        if (!user)
            return error(res, { message: 'User not found', statusCode: 404 });
        const match = await comparePassword(currentPassword, user.password_hash);
        if (!match) {
            return error(res, { message: 'Current password is incorrect', statusCode: 400 });
        }
        const newHash = await hashPassword(newPassword);
        await User.updatePassword(req.user.userId, newHash);
        return success(res, { message: 'Password changed successfully' });
    }
    catch (err) {
        logger.error('[profileController.changePassword]', err);
        return error(res, { message: err.message, statusCode: 500 });
    }
}
// ── POST /api/profile/me/photo ────────────────────────────────────────────────
export async function uploadPhoto(req, res) {
    try {
        if (!req.file) {
            return error(res, { message: 'No photo file provided', statusCode: 400 });
        }
        const userId = req.user.userId;
        const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
        const storagePath = `profile-photos/${userId}/${randomUUID()}${ext}`;
        // Remove old file from storage bucket if one exists
        const activePhoto = await UserPhoto.findActiveByUserId(userId);
        if (activePhoto?.storage_path) {
            const { error: rmErr } = await supabaseStorage
                .storage.from(PHOTO_BUCKET)
                .remove([activePhoto.storage_path]);
            if (rmErr)
                logger.warn('[profileController] Old photo removal failed', rmErr);
        }
        // Upload new file to Supabase storage
        const { error: storageErr } = await supabaseStorage
            .storage.from(PHOTO_BUCKET)
            .upload(storagePath, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: true,
        });
        if (storageErr) {
            logger.error('[profileController] Photo storage upload failed', storageErr);
            return error(res, { message: `Storage upload failed: ${storageErr.message}`, statusCode: 502 });
        }
        const { data: urlData } = supabaseStorage
            .storage.from(PHOTO_BUCKET)
            .getPublicUrl(storagePath);
        const photoUrl = urlData.publicUrl;
        // Persist to user_photos table (deactivates previous row automatically)
        await UserPhoto.create(userId, photoUrl, storagePath);
        // Keep user_profiles in sync for backward compatibility
        await UserProfile.update(userId, { profilePhotoUrl: photoUrl });
        logger.info(`[Profile] Photo uploaded for user ${userId}`);
        return success(res, { message: 'Profile photo updated', data: { photoUrl } });
    }
    catch (err) {
        logger.error('[profileController.uploadPhoto]', err);
        return error(res, { message: err.message, statusCode: 500 });
    }
}
// ── DELETE /api/profile/me/photo ─────────────────────────────────────────────
export async function deletePhoto(req, res) {
    try {
        const userId = req.user.userId;
        const activePhoto = await UserPhoto.findActiveByUserId(userId);
        if (!activePhoto) {
            return error(res, { message: 'No profile photo to delete', statusCode: 404 });
        }
        // Remove from Supabase storage
        const { error: rmErr } = await supabaseStorage
            .storage.from(PHOTO_BUCKET)
            .remove([activePhoto.storage_path]);
        if (rmErr)
            logger.warn('[profileController] Storage delete warning', rmErr);
        // Remove from user_photos table
        await UserPhoto.deleteById(activePhoto.id, userId);
        // Clear synced URL in user_profiles
        await UserProfile.update(userId, { profilePhotoUrl: null });
        logger.info(`[Profile] Photo deleted for user ${userId}`);
        return success(res, { message: 'Profile photo deleted' });
    }
    catch (err) {
        logger.error('[profileController.deletePhoto]', err);
        return error(res, { message: err.message, statusCode: 500 });
    }
}
// ── GET /api/profile/me/photos ────────────────────────────────────────────────
// Returns full photo history for the logged-in user.
export async function getPhotoHistory(req, res) {
    try {
        const photos = await UserPhoto.findAllByUserId(req.user.userId);
        return success(res, { message: 'Photo history fetched', data: { photos } });
    }
    catch (err) {
        logger.error('[profileController.getPhotoHistory]', err);
        return error(res, { message: err.message, statusCode: 500 });
    }
}
//# sourceMappingURL=profileController.js.map