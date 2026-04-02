// src/models/UserProfile.js
const { db } = require('../config/db');

async function create({ userId, fullName, phone }) {
  const { data, error } = await db
    .from('user_profiles')
    .upsert(
      {
        user_id:   userId,
        full_name: fullName,
        phone:     phone || null,
      },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single();
  if (error) throw new Error(`UserProfile.create: ${error.message}`);
  return data;
}

async function findByUserId(userId) {
  const { data, error } = await db
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) return null;
  return data;
}

async function update(userId, { fullName, phone }) {
  const updates = {};
  if (fullName !== undefined) updates.full_name = fullName;
  if (phone    !== undefined) updates.phone     = phone;
  const { data, error } = await db
    .from('user_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw new Error(`UserProfile.update: ${error.message}`);
  return data;
}

module.exports = { create, findByUserId, update };