import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import type { Server } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({
  path: path.join(projectRoot, '.env'),
  override: true
});

const PORT: number = parseInt(process.env.PORT || '5000', 10);

async function startServer(): Promise<Server> {
  // Import modules after dotenv is loaded to prevent race condition
  const { default: app } = await import('./src/app.ts');
  const { db } = await import('./src/config/db.ts');
  const { validateEnv } = await import('./src/config/env.ts');
  const { validateTikTokConfig } = await import('./src/config/tiktok.ts');
  const { default: logger } = await import('./src/utils/logger.ts');
  const { startAutoPublishJob } = await import('./src/jobs/autoPublishJob.ts');
  const { default: commentWSService } = await import('./src/services/commentWebSocketService.ts');
  const { default: notificationWSService } = await import('./src/services/notificationWebSocketService.ts');

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

  // Create HTTP server with Express app
  const httpServer = createServer(app);

  // Initialize Socket.io
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Store io instance on app for use in controllers
  (app as any).io = io;

  // Initialize comment WebSocket service
  commentWSService.init(io);

  // Initialize notification WebSocket service (persistent bell/dropdown center)
  notificationWSService.init(io);

  // Socket.io connection handler
  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId || socket.handshake.query.userId;
    logger.info(`[WebSocket] User ${userId} connected (socket: ${socket.id})`);

    // Join user to their own room for private messages
    if (userId) {
      socket.join(`user:${userId}`);
      socket.data.userId = userId;
    }

    // Event: User sends message
    socket.on('send-message', (data: any) => {
      const { recipientId, messageId, messageText, senderId, createdAt } = data;
      logger.info(`[WebSocket] Message from ${senderId} to ${recipientId}: ${messageId}`);

      // Emit to recipient's room
      io.to(`user:${recipientId}`).emit('receive-message', {
        id: messageId,
        senderId,
        receiverId: recipientId,
        messageText,
        isRead: false,
        createdAt,
      });

      // Emit to sender's room for confirmation
      io.to(`user:${senderId}`).emit('message-sent', {
        id: messageId,
        senderId,
        receiverId: recipientId,
      });
    });

    // Event: User marks message as read
    socket.on('mark-as-read', (data: any) => {
      const { messageId, userId: readerUserId } = data;
      logger.info(`[WebSocket] Message ${messageId} marked as read by ${readerUserId}`);

      // Broadcast to both users
      io.to(`user:${readerUserId}`).emit('message-read', { messageId });
    });

    // Event: User is typing
    socket.on('typing', (data: any) => {
      const { recipientId, senderName } = data;
      io.to(`user:${recipientId}`).emit('user-typing', {
        senderId: socket.data.userId,
        senderName,
      });
    });

    // Event: User stopped typing
    socket.on('stop-typing', (data: any) => {
      const { recipientId } = data;
      io.to(`user:${recipientId}`).emit('user-stop-typing', {
        senderId: socket.data.userId,
      });
    });

    // Event: User is online/active
    socket.on('user-online', (data: any) => {
      socket.broadcast.emit('user-status', {
        userId: socket.data.userId,
        status: 'online',
      });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      logger.info(`[WebSocket] User ${socket.data.userId} disconnected (socket: ${socket.id})`);
      socket.broadcast.emit('user-status', {
        userId: socket.data.userId,
        status: 'offline',
      });
    });

    // Event: Business Owner joins the calendar updates broadcast room
    socket.on('calendar:join-updates', () => {
      socket.join('calendar:updates');
      logger.info(`[WebSocket] Socket ${socket.id} joined calendar:updates`);
    });

    // Error handler
    socket.on('error', (err: any) => {
      logger.error(`[WebSocket] Error from socket ${socket.id}:`, err);
    });
  });

  const server: Server = httpServer.listen(PORT, '0.0.0.0', () => {
    logger.info('╔═══════════════════════════════════════════╗');
    logger.info('║        LeadFlow API  ·  v1.0.0            ║');
    logger.info('╚═══════════════════════════════════════════╝');
    logger.info(`ENV       : ${process.env.NODE_ENV || 'development'}`);
    logger.info(`PORT      : ${PORT}`);
    logger.info(`URL       : http://localhost:${PORT}`);
    logger.info(`WebSocket : ws://localhost:${PORT}`);
    logger.info(`TZ        : Asia/Jakarta (GMT+7)`);
  });

  process.on('SIGTERM', () => {
    logger.info('[Server] SIGTERM received — shutting down');
    io.close();
    server.close(() => {
      logger.info('[Server] Closed');
      process.exit(0);
    });
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('[Server] Unhandled rejection:', reason);
  });

  startAutoPublishJob(io);

  // Store comment service on app for use in controllers
  (app as any).commentWSService = commentWSService;

  // Store notification service on app for use in controllers/models
  (app as any).notificationWSService = notificationWSService;

  return server;
}

startServer();
