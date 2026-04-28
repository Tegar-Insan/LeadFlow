import dotenv from 'dotenv';
import type { Server } from 'http';

dotenv.config({ override: true });

const PORT: number = parseInt(process.env.PORT || '5000', 10);

async function startServer(): Promise<Server> {
  const [{ default: app }, { db }, { validateEnv }, { validateTikTokConfig }, { default: logger }, { startAutoPublishJob }] = await Promise.all([
    import('./src/app.ts'),
    import('./src/config/db.ts'),
    import('./src/config/env.ts'),
    import('./src/config/tiktok.ts'),
    import('./src/utils/logger.ts'),
    import('./src/jobs/autoPublishJob.ts'),
  ]);

  validateEnv();
  validateTikTokConfig();

  const { error } = await db.from('roles').select('count').limit(1);
  if (error) {
    logger.error(`[DB] Connection FAILED: ${error.message}`);
    logger.error('[DB] Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  logger.info('[DB] Connected to Supabase PostgreSQL ✓');
  logger.info(`[TikTok] redirect_uri=${process.env.TIKTOK_REDIRECT_URI}`);

  const server: Server = app.listen(PORT, () => {
    logger.info('╔═══════════════════════════════════════════╗');
    logger.info('║        LeadFlow API  ·  v1.0.0            ║');
    logger.info('╚═══════════════════════════════════════════╝');
    logger.info(`ENV  : ${process.env.NODE_ENV || 'development'}`);
    logger.info(`PORT : ${PORT}`);
    logger.info(`URL  : http://localhost:${PORT}`);
    logger.info(`TZ   : Asia/Jakarta (GMT+7)`);
  });

  process.on('SIGTERM', () => {
    logger.info('[Server] SIGTERM received — shutting down');
    server.close(() => {
      logger.info('[Server] Closed');
      process.exit(0);
    });
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('[Server] Unhandled rejection:', reason);
  });

  startAutoPublishJob();

  return server;
}

startServer();