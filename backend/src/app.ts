import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import cookieParser from 'cookie-parser';
import sanitizeInput from './middleware/sanitizeInput.ts';
import errorHandler from './middleware/errorHandler.ts';
import { apiLimiter } from './middleware/rateLimiter.ts';

import authRoutes from './routes/authRoutes.ts';
import profileRoutes from './routes/profileRoutes.ts';
import calendarRoutes from './routes/calendarRoutes.ts';
import promptRoutes from './routes/promptRoutes.ts';
import contentIdeaRoutes from './routes/contentIdeaRoutes.ts';
import commentsRoutes from './routes/commentsRoutes.ts';
import scheduleRoutes from './routes/scheduleRoutes.ts';
import mediaRoutes from './routes/mediaRoutes.ts';
import adminRoutes from './routes/roleRoutes.ts';
import chatbotRoutes from './routes/chatbotRoutes.ts';
import tiktokRoutes from './routes/tiktokRoutes.ts';
import publicMediaRoutes from './routes/publicMediaRoutes.ts';
import analyticsRoutes from './routes/analyticsRoutes.ts';
import dashboardRoutes from './routes/dashboardRoutes.ts';
import notificationRoutes from './routes/notificationRoutes.ts';
import agentRoutes from './routes/agentRoutes.ts';

const app = express();

app.use((_req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

const tiktokVerificationToken = (process.env['TIKTOK_SITE_VERIFICATION_TOKEN'] ?? '').trim();
const tiktokVerificationPayload = tiktokVerificationToken
  ? `tiktok-developers-site-verification=${tiktokVerificationToken}`
  : null;

const sendTikTokVerification = (res: express.Response): express.Response => {
  if (!tiktokVerificationPayload) {
    return res.status(404).type('text/plain').send('TikTok verification token is not configured');
  }

  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Surrogate-Control': 'no-store',
  });
  res.removeHeader('ETag');
  return res.status(200).type('text/plain').send(tiktokVerificationPayload);
};

const allowedFrontend = [
  process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

const allowedBackend = [
  process.env['BACKEND_URL'] ?? 'http://localhost:5000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
];

const allowed = [...allowedFrontend, ...allowedBackend];

const isDev = process.env['NODE_ENV'] !== 'production';

const corsOptions: Parameters<typeof cors>[0] = {
  origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    // In dev: allow all origins from allowedFrontend + allowedBackend
    // In prod: only allow origins in the allowed list
    const allowedOrigins = isDev ? [...allowedFrontend, ...allowedBackend] : allowed;
    
    // If no origin (same-origin requests), always allow
    if (!origin) {
      return cb(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    
    return cb(new Error(`CORS blocked: origin '${origin}' not in allowed list`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-JSON-Response-Size'],
  maxAge: 86400, // 24 hours preflight cache
  optionsSuccessStatus: 200, // Some browsers (IE11) choke on 204
};

// CORS must be registered BEFORE helmet — helmet can override headers otherwise
app.use(cors(corsOptions));

// Explicitly handle preflight OPTIONS for all routes
app.options('*', cors(corsOptions));

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false, // Prevent CORP header from blocking cross-origin requests
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(sanitizeInput);

if (process.env['NODE_ENV'] !== 'test') {
  app.use(morgan(process.env['NODE_ENV'] === 'production' ? 'combined' : 'dev'));
}

app.use('/api', apiLimiter);

app.get('/health', (_req, res) =>
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      service: 'LeadFlow API',
      version: '1.0.0',
      environment: process.env['NODE_ENV'],
      timezone: 'Asia/Jakarta (GMT+7)',
      timestamp: new Date().toISOString(),
    },
  }),
);

app.use(express.static('public'));
app.set('etag', false);


app.get('/', (_req, res) => sendTikTokVerification(res));
app.get('/tiktok-developers-site-verification.txt', (_req, res) => sendTikTokVerification(res));
app.get(/^\/tiktok[A-Za-z0-9]+\.txt$/, (_req, res) => sendTikTokVerification(res));
app.get(/^\/.+\/tiktok[A-Za-z0-9]+\.txt$/, (_req, res) => sendTikTokVerification(res));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/prompt', promptRoutes);
app.use('/api/content', contentIdeaRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/tiktok', tiktokRoutes);
app.use('/tiktok/public', publicMediaRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/agent', agentRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${_req.method} ${_req.originalUrl}`,
  });
});

app.use(errorHandler);

export default app;
