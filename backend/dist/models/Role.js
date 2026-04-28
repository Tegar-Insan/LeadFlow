"use strict";
// src/models/Role.js
const { db } = require('../config/db');
const ROLE_NAMES = {
    ADMIN: 'admin',
    BUSINESS_OWNER: 'business_owner',
    MARKETING_STAFF: 'marketing_staff',
};
async function findAll() {
    const { data, error } = await db
        .from('roles')
        .select('*')
        .order('name');
    if (error)
        throw new Error(`Role.findAll: ${error.message}`);
    return data;
}
async function findByName(roleName) {
    const { data, error } = await db
        .from('roles')
        .select('*')
        .eq('name', roleName)
        .single();
    if (error)
        return null;
    return data;
}
async function findById(roleId) {
    const { data, error } = await db
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();
    if (error)
        return null;
    return data;
}
module.exports = { ROLE_NAMES, findAll, findByName, findById };
//# sourceMappingURL=Role.js.map