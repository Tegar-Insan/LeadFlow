// @ts-nocheck
// src/models/Role.ts
import { db } from "../config/db.js";
export const ROLE_NAMES = {
    ADMIN: 'admin',
    BUSINESS_OWNER: 'business_owner',
    MARKETING_STAFF: 'marketing_staff',
};
export async function findAll() {
    const { data, error } = await db
        .from('roles')
        .select('*')
        .order('name');
    if (error)
        throw new Error(`Role.findAll: ${error.message}`);
    return data;
}
export async function findByName(roleName) {
    const { data, error } = await db
        .from('roles')
        .select('*')
        .eq('name', roleName)
        .single();
    if (error)
        return null;
    return data;
}
export async function findById(roleId) {
    const { data, error } = await db
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();
    if (error)
        return null;
    return data;
}
//# sourceMappingURL=Role.js.map