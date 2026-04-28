// src/config/db.ts
// Database connection — re-exports Supabase admin client as primary DB interface

import { supabaseAdmin } from './supabase.ts';

export const db = supabaseAdmin;