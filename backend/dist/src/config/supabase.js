// src/config/supabase.ts
// Supabase client initialisation — admin (service role) + anon clients
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('[Supabase] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});
export const supabaseAnon = createClient(supabaseUrl, anonKey || '', {
    auth: { autoRefreshToken: false, persistSession: false },
});
//# sourceMappingURL=supabase.js.map