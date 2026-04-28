// src/config/db.ts
// Database connection — re-exports Supabase admin client as primary DB interface
import { supabaseAdmin } from "./supabase.js";
export const db = supabaseAdmin;
//# sourceMappingURL=db.js.map