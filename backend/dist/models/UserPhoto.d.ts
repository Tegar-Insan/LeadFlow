/**
 * Insert a new active photo for the user and deactivate any previous active photo.
 * @param {string} userId
 * @param {string} photoUrl   - Supabase public URL
 * @param {string} storagePath - path inside the bucket (used for deletion)
 * @returns {object} new user_photos row
 */
export function create(userId: string, photoUrl: string, storagePath: string): object;
/**
 * Return the current active photo for a user, or null if none.
 */
export function findActiveByUserId(userId: any): Promise<any>;
/**
 * Return all photo rows for a user, newest first.
 */
export function findAllByUserId(userId: any): Promise<any[]>;
/**
 * Hard-delete a photo row by id, scoped to userId for safety.
 */
export function deleteById(id: any, userId: any): Promise<void>;
//# sourceMappingURL=UserPhoto.d.ts.map