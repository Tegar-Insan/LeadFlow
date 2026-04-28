import dotenv from 'dotenv';
dotenv.config({ override: true });
const PORT = parseInt(process.env.PORT || '5000', 10);
async function startServer() {
    const [{ default: app }, { db }, { validateEnv }, { validateTikTokConfig }, { default: logger }, { startAutoPublishJob }] = await Promise.all([
        import("./src/app.js"),
        import("./src/config/db.js"),
        import("./src/config/env.js"),
        import("./src/config/tiktok.js"),
        import("./src/utils/logger.js"),
        import("./src/jobs/autoPublishJob.js"),
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
        server.close(() => {
            logger.info('[Server] Closed');
            process.exit(0);
        });
    });
    process.on('unhandledRejection', (reason) => {
        logger.error('[Server] Unhandled rejection:', reason);
    });
    startAutoPublishJob();
    return server;
}
startServer();
//# sourceMappingURL=server.js.map