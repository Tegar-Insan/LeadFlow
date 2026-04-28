/**
 * Insert a new active photo for the user and deactivate any previous active photo.
 * @param {string} userId
 * @param {string} photoUrl   - Supabase public URL
 * @param {string} storagePath - path inside the bucket (used for deletion)
 * @returns {object} new user_photos row
 */
export declare function create(userId: string, photoUrl: string, storagePath: string): Promise<Record<string, unknown>>;
/**
 * Return the current active photo for a user, or null if none.
 */
export declare function findActiveByUserId(userId: string): Promise<Record<string, unknown> | null>;
/**
 * Return all photo rows for a user, newest first.
 */
export declare function findAllByUserId(userId: string): Promise<Record<string, unknown>[]>;
/**
 * Hard-delete a photo row by id, scoped to userId for safety.
 */
export declare function deleteById(id: string, userId: string): Promise<void>;
//# sourceMappingURL=UserPhoto.d.ts.map