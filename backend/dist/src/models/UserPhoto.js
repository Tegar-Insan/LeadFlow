// @ts-nocheck
// src/models/UserPhoto.ts
// CRUD for the user_photos table.
// Invariant: at most ONE row per user_id has is_active = TRUE (enforced by partial unique index).
import { db } from "../config/db.js";
/**
 * Insert a new active photo for the user and deactivate any previous active photo.
 * @param {string} userId
 * @param {string} photoUrl   - Supabase public URL
 * @param {string} storagePath - path inside the bucket (used for deletion)
 * @returns {object} new user_photos row
 */
export async function create(userId, photoUrl, storagePath) {
    // Deactivate existing active photo first
    await db
        .from('user_photos')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);
    const { data, error } = await db
        .from('user_photos')
        .insert({
        user_id: userId,
        photo_url: photoUrl,
        storage_path: storagePath,
        is_active: true,
    })
        .select('*')
        .single();
    if (error)
        throw new Error(`UserPhoto.create: ${error.message}`);
    return data;
}
/**
 * Return the current active photo for a user, or null if none.
 */
export async function findActiveByUserId(userId) {
    const { data } = await db
        .from('user_photos')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
    return data || null;
}
/**
 * Return all photo rows for a user, newest first.
 */
export async function findAllByUserId(userId) {
    const { data, error } = await db
        .from('user_photos')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });
    if (error)
        throw new Error(`UserPhoto.findAllByUserId: ${error.message}`);
    return data || [];
}
/**
 * Hard-delete a photo row by id, scoped to userId for safety.
 */
export async function deleteById(id, userId) {
    const { error } = await db
        .from('user_photos')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
    if (error)
        throw new Error(`UserPhoto.deleteById: ${error.message}`);
}
//# sourceMappingURL=UserPhoto.js.map