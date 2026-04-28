"use strict";
// src/config/env.js
// Validates all required environment variables at startup
const REQUIRED = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
];
function validateEnv() {
    const missing = REQUIRED.filter((k) => !process.env[k]);
    if (missing.length > 0) {
        console.error(`[ENV] Missing required variables: ${missing.join(', ')}`);
        process.exit(1);
    }
    console.log('[ENV] Environment variables validated ✓');
}
module.exports = { validateEnv };
//# sourceMappingURL=env.js.map