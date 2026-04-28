// @ts-nocheck
// src/models/User.ts
import { db } from "../config/db.js";
// Matches EXACT column names from 002_create_users.sql + 001_create_roles.sql
const SELECT_WITH_RELATIONS = `
  id, role_id, email, password_hash, is_active, email_verified,
  created_at, updated_at,
  roles ( id, name ),
  user_profiles ( id, full_name, phone )
`;
export async function findByEmail(email) {
    const { data, error } = await db
        .from('users')
        .select(SELECT_WITH_RELATIONS)
        .eq('email', email.toLowerCase())
        .single();
    if (error)
        return null;
    return data;
}
export async function findById(userId) {
    const { data, error } = await db
        .from('users')
        .select(SELECT_WITH_RELATIONS)
        .eq('id', userId)
        .single();
    if (error)
        return null;
    return data;
}
// ✅ CORRECT — 'id' is the correct column name
export async function emailExists(email) {
    const { data } = await db
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();
    return !!data;
}
export async function create({ email, passwordHash, roleId }) {
    // ✅ upsert — handles duplicate email from retry attempts
    const { data, error } = await db
        .from('users')
        .upsert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role_id: roleId,
        is_active: true,
        email_verified: false,
    }, { onConflict: 'email' })
        .select(`id, role_id, email, is_active, email_verified, created_at, roles(id, name)`)
        .single();
    if (error)
        throw new Error(`User.create: ${error.message}`);
    return data;
}
export async function markEmailVerified(email) {
    const { error } = await db
        .from('users')
        .update({ email_verified: true })
        .eq('email', email.toLowerCase());
    if (error)
        throw new Error(`User.markEmailVerified: ${error.message}`);
}
export async function updatePassword(userId, passwordHash) {
    const { error } = await db
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('id', userId);
    if (error)
        throw new Error(`User.updatePassword: ${error.message}`);
}
export async function setActive(userId, isActive) {
    const { error } = await db
        .from('users')
        .update({ is_active: isActive })
        .eq('id', userId);
    if (error)
        throw new Error(`User.setActive: ${error.message}`);
}
export async function findAll({ page = 1, limit = 20, roleId = null } = {}) {
    let q = db
        .from('users')
        .select(`id, role_id, email, is_active, email_verified, created_at,
       roles(id, name), user_profiles(full_name, phone)`, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
    if (roleId)
        q = q.eq('role_id', roleId);
    const { data, error, count } = await q;
    if (error)
        throw new Error(`User.findAll: ${error.message}`);
    return { users: data, total: count };
}
//# sourceMappingURL=User.js.map