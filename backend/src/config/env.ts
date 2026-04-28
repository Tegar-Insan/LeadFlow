// src/config/env.ts
// Validates all required environment variables at startup

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'] as const;

export function validateEnv(): void {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[ENV] Missing required variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log('[ENV] Environment variables validated ✓');
}