require('dotenv').config();

// ── Validate environment variables at startup (fail-fast) ──────────────────
const { validateEnv } = require('./config/env.validator');
validateEnv();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger.config');
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
const youtubeRoutesV2 = require('./routes/social/youtube.routes.v2');
const tiktokRoutesV2 = require('./routes/social/tiktok.routes.v2');
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

// Routes - External Integrations (e.g. Convo — HMAC-signed, no user session)
const convoIntegrationRoutes = require('./routes/integrations/convo-integration.routes');

// BullMQ Dashboard
const queueDashboard = require('./queues/dashboard');
const { verifyAuth } = require('./middlewares/auth.middleware');
const { authorizeAdmin } = require('./middlewares/authorization.middleware');

const app = express();

// Trust proxy for rate limiting behind reverse proxies (like Render)
app.set('trust proxy', 1);

// ── Structured HTTP request logger (replaces raw console.log) ──────────────
app.use(logger.httpMiddleware());

// ── CORS — whitelist driven by env var, not hardcoded localhost ────────────
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '')
  .replace(/['"]/g, '') // Clean single/double quotes
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // Always allow localhost/127.0.0.1 in development
    const isLocalhost = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
    const isNgrok = origin.endsWith('.ngrok-free.dev') || origin.endsWith('.ngrok.io');
    
    // Check wildcard, exact match or auto-whitelist vercel subdomains
    const isAllowed = isLocalhost || isNgrok || ALLOWED_ORIGINS.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const regex = new RegExp('^' + allowedOrigin.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
        return regex.test(origin);
      }
      return allowedOrigin === origin;
    }) || origin.endsWith('.vercel.app');

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
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
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

// ── API docs — non-production only, no route documents production secrets ──
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// ── Initialize Event Subscribers ───────────────────────────────────────────
require('./events/subscribers/post.subscriber')();
require('./events/subscribers/autolist.subscriber')();
const { initSocialSubscriber } = require('./events/subscribers/social.subscriber');
initSocialSubscriber();

// ── Static file serving ────────────────────────────────────────────────────
// Reports contain a brand's private analytics — they're only fetchable
// through GET /api/reports/:id/download (checkPermission + brand-ownership
// check), never as a raw static path. Block it before express.static ever
// sees the request, rather than relying on nothing existing at that path.
app.use('/uploads/reports', (req, res) => {
  res.status(403).json({ message: 'Direct access to report files is not allowed. Use /api/reports/:id/download.' });
});

app.use('/uploads', express.static('uploads', {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  }
}));

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/oauth', authRoutes);
app.use('/api', profileRoutes);
app.use('/api/admin/pricing', pricingRoutes);
app.use('/api/admin/audit-logs', auditLogRoutes);
app.use('/api/search', searchRoutes);
const livestreamRoutes = require('./routes/workspace/livestream.routes');
app.use('/api/livestreams', livestreamRoutes);
const highlightRoutes = require('./routes/workspace/highlight.routes');
app.use('/api/highlights', highlightRoutes);
const ticketRoutes = require('./routes/workspace/ticket.routes');

app.use('/api/posts', postRoutes);
app.use('/api/calendar-events', calendarEventRoutes);
const stockRoutes = require('./routes/workspace/stock.routes');
app.use('/api/stock', stockRoutes);
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

// ── API v2 (response envelope {message, data} — parallel to v1, v1 unchanged) ──
app.use('/api/v2/social/youtube', youtubeRoutesV2);
app.use('/api/v2/social/tiktok', tiktokRoutesV2);
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

// ── External Integration Routes ─────────────────────────────────────────────
// HMAC-signed, no user session — see src/middlewares/hmac-auth.middleware.js
app.use('/api/integrations', convoIntegrationRoutes);

// ── BullMQ Dashboard — admin-only ──────────────────────────────────────────
// Job payloads can contain tokens, brand data, and post content, and the
// dashboard allows retry/remove/promote. Gate it behind auth + ADMIN role so
// it is never reachable unauthenticated (see issue #117).
app.use('/admin/queues', verifyAuth, authorizeAdmin, queueDashboard.getRouter());

app.get('/', (_req, res) => {
  res.json({ name: 'PubliCast API', status: 'running', version: '1.0.0' });
});

// ── Global Error Handler — must be last ───────────────────────────────────
const errorHandler = require('./middlewares/error-handler.middleware');
app.use(errorHandler);

module.exports = app;

