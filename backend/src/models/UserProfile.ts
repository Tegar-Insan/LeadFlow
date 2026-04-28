// @ts-nocheck
// src/models/UserProfile.ts
import { db } from '../config/db.ts';

export async function create({ userId, fullName, phone }: { userId: string; fullName: string; phone?: string | null }): Promise<Record<string, unknown>> {
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

export async function findByUserId(userId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await db
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) return null;
  return data;
}

export async function update(
  userId: string,
  { fullName, phone, profilePhotoUrl }: { fullName?: string; phone?: string | null; profilePhotoUrl?: string | null },
): Promise<Record<string, unknown>> {
  const updates: Record<string, unknown> = {};
  if (fullName        !== undefined) updates.full_name         = fullName;
  if (phone           !== undefined) updates.phone             = phone;
  if (profilePhotoUrl !== undefined) updates.profile_photo_url = profilePhotoUrl;
  const { data, error } = await db
    .from('user_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw new Error(`UserProfile.update: ${error.message}`);
  return data;
}
