// src/controllers/profileController.js
// CRUD for own profile: read, update name/phone, change password, upload photo

const path            = require('path');
const { v4: uuidv4 }  = require('uuid');
const multer          = require('multer');
const { createClient } = require('@supabase/supabase-js');
const User             = require('../models/User');
const UserProfile      = require('../models/UserProfile');
const { hashPassword, comparePassword } = require('../utils/passwordHelper');
const { success, error } = require('../utils/responseHelper');
const logger           = require('../utils/logger');

// ── Supabase storage client (same pattern as mediaController) ─────────────
const supabaseStorage = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const PHOTO_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'content-assets';

// ── Multer — images only, 5 MB cap ───────────────────────────────────────
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];

const photoUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) =>
    ALLOWED_IMAGE_MIME.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only JPEG, PNG or WEBP images are allowed'), false),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

const photoUploadMiddleware = photoUpload.single('photo');

// GET /api/profile/me
async function getProfile(req, res) {
  try {
    const user    = await User.findById(req.user.userId);
    if (!user) return error(res, { message: 'User not found', statusCode: 404 });

    const profile = await UserProfile.findByUserId(req.user.userId);

    return success(res, {
      message: 'Profile fetched',
      data: {
        id:       user.id,
        email:    user.email,
        fullName: profile?.full_name  || null,
        phone:    profile?.phone      || null,
        photoUrl: profile?.profile_photo_url || null,
        roleName: user.roles?.name    || null,
        isActive: user.is_active,
      },
    });
  } catch (err) {
    return error(res, { message: err.message, statusCode: 500 });
  }
}

// PUT /api/profile/me — update fullName and/or phone
async function updateProfile(req, res) {
  try {
    const { fullName, phone } = req.body;

    const updates = {};
    if (fullName !== undefined) updates.fullName = fullName.trim();
    if (phone    !== undefined) updates.phone    = phone.trim() || null;

    if (Object.keys(updates).length === 0) {
      return error(res, { message: 'No fields to update', statusCode: 400 });
    }

    const profile = await UserProfile.update(req.user.userId, updates);

    return success(res, {
      message: 'Profile updated',
      data: {
        fullName: profile.full_name,
        phone:    profile.phone,
      },
    });
  } catch (err) {
    return error(res, { message: err.message, statusCode: 500 });
  }
}

// PUT /api/profile/me/password — change own password
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return error(res, { message: 'currentPassword and newPassword are required', statusCode: 400 });
    }
    if (newPassword.length < 8) {
      return error(res, { message: 'New password must be at least 8 characters', statusCode: 400 });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return error(res, { message: 'User not found', statusCode: 404 });

    const match = await comparePassword(currentPassword, user.password_hash);
    if (!match) {
      return error(res, { message: 'Current password is incorrect', statusCode: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await User.updatePassword(req.user.userId, newHash);

    return success(res, { message: 'Password changed successfully' });
  } catch (err) {
    return error(res, { message: err.message, statusCode: 500 });
  }
}

// POST /api/profile/me/photo — upload profile photo
async function uploadPhoto(req, res) {
  try {
    if (!req.file) {
      return error(res, { message: 'No photo file provided', statusCode: 400 });
    }

    const ext         = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const storagePath = `profile-photos/${req.user.userId}/${uuidv4()}${ext}`;

    // Delete previous photo if one exists
    const existing = await UserProfile.findByUserId(req.user.userId);
    if (existing?.profile_photo_url) {
      // Extract storage path from existing public URL
      const oldPath = existing.profile_photo_url
        .split(`/${PHOTO_BUCKET}/`)[1];
      if (oldPath) {
        await supabaseStorage.storage.from(PHOTO_BUCKET).remove([oldPath]);
      }
    }

    // Upload new photo to Supabase storage
    const { error: storageErr } = await supabaseStorage
      .storage.from(PHOTO_BUCKET)
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert:      true,
      });

    if (storageErr) {
      logger.error('[profileController] Photo storage error', storageErr);
      return error(res, { message: `Storage upload failed: ${storageErr.message}`, statusCode: 502 });
    }

    const { data: urlData } = supabaseStorage
      .storage.from(PHOTO_BUCKET)
      .getPublicUrl(storagePath);

    const photoUrl = urlData.publicUrl;

    await UserProfile.update(req.user.userId, { profilePhotoUrl: photoUrl });

    logger.info(`[Profile] Photo uploaded for user ${req.user.userId}`);
    return success(res, { message: 'Profile photo updated', data: { photoUrl } });
  } catch (err) {
    logger.error('[profileController.uploadPhoto]', err);
    return error(res, { message: err.message, statusCode: 500 });
  }
}

module.exports = { getProfile, updateProfile, changePassword, uploadPhoto, photoUploadMiddleware };
