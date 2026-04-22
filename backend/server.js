// server.js
require('dotenv').config();
const { validateEnv } = require('./src/config/env');
validateEnv();

const app    = require('./src/app');
const logger = require('./src/utils/logger');
const { db } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

// ✅ Test DB connection before starting server
async function startServer() {
  // Ping Supabase — query roles table (always exists)
  const { data, error } = await db.from('roles').select('count').limit(1);
  if (error) {
    logger.error(`[DB] Connection FAILED: ${error.message}`);
    logger.error('[DB] Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1); // Stop server if DB unreachable
  } else {
    logger.info('[DB] Connected to Supabase PostgreSQL ✓');
  }

  const server = app.listen(PORT, () => {
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
    server.close(() => { logger.info('[Server] Closed'); process.exit(0); });
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('[Server] Unhandled rejection:', reason);
  });

  return server;
}

startServer();

const { startAutoPublishJob } = require('./src/jobs/autoPublishJob');
startAutoPublishJob();