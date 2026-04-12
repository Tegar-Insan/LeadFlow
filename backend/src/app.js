// src/app.js
// Express application — middleware stack, routes, error handling

const express       = require('express');
const cors          = require('cors');
const helmet        = require('helmet');
const morgan        = require('morgan');
const cookieParser  = require('cookie-parser');
const sanitizeInput = require('./middleware/sanitizeInput');
const errorHandler  = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { success }    = require('./utils/responseHelper');
const logger         = require('./utils/logger');

// ── Routes ────────────────────────────────────────────────────
const authRoutes     = require('./routes/authRoutes');
const profileRoutes  = require('./routes/profileRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const mediaRoutes    = require('./routes/mediaRoutes');
const adminRoutes    = require('./routes/roleRoutes');

const app = express();

// ── Security headers ──────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));

// ── CORS ──────────────────────────────────────────────────────
const allowed = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];
app.use(cors({
  origin: (origin, cb) =>
    !origin || allowed.includes(origin)
      ? cb(null, true)
      : cb(new Error(`CORS blocked: ${origin}`)),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body / Cookie parsing ─────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── XSS sanitization ─────────────────────────────────────────
app.use(sanitizeInput);

// ── HTTP logging ──────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Global rate limiter ───────────────────────────────────────
app.use('/api', apiLimiter);

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.status(200).json({
    success: true,
    data: {
      status:      'healthy',
      service:     'LeadFlow API',
      version:     '1.0.0',
      environment: process.env.NODE_ENV,
      timezone:    'Asia/Jakarta (GMT+7)',
      timestamp:   new Date().toISOString(),
    },
  })
);

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/profile',  profileRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/media',    mediaRoutes);
app.use('/api/admin',    adminRoutes);

// ── 404 — must be AFTER all routes ───────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Global error handler — must be last ──────────────────────
app.use(errorHandler);

module.exports = app;