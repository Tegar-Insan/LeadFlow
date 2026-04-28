"use strict";
// src/config/supabase.js
// Supabase client initialisation — admin (service role) + anon clients
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('[Supabase] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}
// Admin client — bypasses RLS, used only on backend
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});
// Anon client — respects RLS policies
const supabaseAnon = createClient(supabaseUrl, anonKey || '', {
    auth: { autoRefreshToken: false, persistSession: false },
});
module.exports = { supabaseAdmin, supabaseAnon };
//# sourceMappingURL=supabase.js.map