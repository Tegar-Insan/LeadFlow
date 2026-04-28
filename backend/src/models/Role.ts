// @ts-nocheck
// src/models/Role.ts
import { db } from '../config/db.ts';

export const ROLE_NAMES = {
  ADMIN:           'admin',
  BUSINESS_OWNER:  'business_owner',
  MARKETING_STAFF: 'marketing_staff',
};

export async function findAll(): Promise<Record<string, unknown>[]> {
  const { data, error } = await db
    .from('roles')
    .select('*')
    .order('name');
  if (error) throw new Error(`Role.findAll: ${error.message}`);
  return data;
}

export async function findByName(roleName: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await db
    .from('roles')
    .select('*')
    .eq('name', roleName)
    .single();
  if (error) return null;
  return data;
}

export async function findById(roleId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await db
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .single();
  if (error) return null;
  return data;
}
