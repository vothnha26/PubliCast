require('dotenv').config();

// ── Validate environment variables at startup (fail-fast) ──────────────────
const { validateEnv } = require('./config/env.validator');
validateEnv();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const logger = require('./utils/logger');

// Routes - Auth Domain
const authRoutes = require('./routes/auth/auth.routes');
const profileRoutes = require('./routes/auth/profile.routes');

// Routes - Admin Domain
const pricingRoutes = require('./routes/admin/pricing.routes');
const auditLogRoutes = require('./routes/admin/audit-log.routes');
const revenueRoutes = require('./routes/admin/revenue.routes');
const productRoutes = require('./routes/admin/product.routes');
const platformLimitRoutes = require('./routes/admin/platform-limit.routes');
const userRoutes = require('./routes/admin/user.routes');

// Routes - Social Domain
const socialRoutes = require('./routes/social/social.routes');
const inboxRoutes = require('./routes/social/inbox.routes');

// Routes - Workspace Domain
// const livestreamRoutes = require('./routes/workspace/livestream.routes');
const postRoutes = require('./routes/workspace/post.routes');
const mediaLibraryRoutes = require('./routes/workspace/media-library.routes');
const mediaFolderRoutes = require('./routes/workspace/media-folder.routes');
const teamRoutes = require('./routes/workspace/team.routes');
const brandRoutes = require('./routes/workspace/brand.routes');
const autoListRoutes = require('./routes/workspace/auto-list.routes');
const roleRoutes = require('./routes/workspace/role.routes');
const smartLinkRoutes = require('./routes/workspace/smart-link.routes');
const permissionRoutes = require('./routes/workspace/permission.routes');
const approvalWorkflowRoutes = require('./routes/workspace/approval-workflow.routes');
const aiRoutes = require('./routes/workspace/ai.routes');
const reportRoutes = require('./routes/workspace/report.routes');
const hashtagRoutes = require('./routes/workspace/hashtag.routes');
const adAccountRoutes = require('./routes/workspace/ad-account.routes');
const calendarEventRoutes = require('./routes/workspace/calendar-event.routes');


// Routes - Core Domain
const searchRoutes = require('./routes/core/search.routes');
const notificationRoutes = require('./routes/core/notification.routes');

// Routes - Billing Domain
const subscriptionRoutes = require('./routes/billing/subscription.routes');
const webhookRoutes = require('./routes/billing/webhook.routes');

// BullMQ Dashboard
const queueDashboard = require('./queues/dashboard');

const app = express();

// ── Structured HTTP request logger (replaces raw console.log) ──────────────
app.use(logger.httpMiddleware());

// ── CORS — whitelist driven by env var, not hardcoded localhost ────────────
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // Always allow localhost/127.0.0.1 in development
    const isLocalhost = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
    const isAllowed = isLocalhost || ALLOWED_ORIGINS.includes(origin);

    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked origin', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
}));

// ── Body parsers — limit JSON to 10MB to prevent payload DoS ──────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── Health check endpoints (required for load balancers, k8s probes) ───────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/ready', async (_req, res) => {
  try {
    const prisma = require('./config/prisma');
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ready', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('Readiness check failed', err);
    res.status(503).json({ status: 'not ready', db: 'disconnected' });
  }
});

// ── Initialize Event Subscribers ───────────────────────────────────────────
require('./events/subscribers/post.subscriber')();
require('./events/subscribers/user.subscriber')();
require('./events/subscribers/autolist.subscriber')();

// ── Static file serving ────────────────────────────────────────────────────
app.use('/uploads', express.static('uploads', {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  }
}));

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api', profileRoutes);
app.use('/api/admin/pricing', pricingRoutes);
app.use('/api/admin/audit-logs', auditLogRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/livestreams', (_req, res) => {
  res.status(503).json({ message: 'Livestream feature is temporarily disabled' });
});
const ticketRoutes = require('./routes/workspace/ticket.routes');

app.use('/api/posts', postRoutes);
app.use('/api/calendar-events', calendarEventRoutes);
app.use('/api/media', mediaLibraryRoutes);
app.use('/api/media-folders', mediaFolderRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin/revenue', revenueRoutes);
app.use('/api/admin/products', productRoutes);
app.use('/api/admin/platform-limits', platformLimitRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/brands/:brandId/roles', roleRoutes);
app.use('/api/brands/:brandId/workflows', approvalWorkflowRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/auto-lists', autoListRoutes);
app.use('/api/smart-links', smartLinkRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/hashtags', hashtagRoutes);
app.use('/api/ad-accounts', adAccountRoutes);


// ── Billing Routes ─────────────────────────────────────────────────────────
app.use('/api/billing/subscriptions', subscriptionRoutes);
app.use('/api/webhooks', webhookRoutes);  // SePay POSTs to /api/webhooks/sepay
app.use('/api/payments', webhookRoutes);  // Alias for backward compatibility with user's SePay config

// ── BullMQ Dashboard — protected in production ─────────────────────────────
// WARNING: In production, add authentication middleware before this route.
// Example: app.use('/admin/queues', verifyAuth, authorize('ADMIN'), queueDashboard.getRouter())
app.use('/admin/queues', queueDashboard.getRouter());

app.get('/', (_req, res) => {
  res.json({ name: 'PubliCast API', status: 'running', version: '1.0.0' });
});

// ── Global Error Handler — must be last ───────────────────────────────────
const errorHandler = require('./middlewares/error-handler.middleware');
app.use(errorHandler);

module.exports = app;

