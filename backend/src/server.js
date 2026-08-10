require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const prisma = require('./config/prisma');
const redisClient = require('./config/redis');

const PORT = parseInt(process.env.PORT, 10) || 3000;

const socketManager = require('./services/workspace/socket/socket.manager');

const server = app.listen(PORT, async () => {
  logger.info('Server started', { port: PORT, env: process.env.NODE_ENV || 'development' });

  // Initialize SocketManager with HTTP server and CORS configuration matching app.js
  const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  const corsOptions = {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const isLocalhost = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
      const isAllowed = isLocalhost || ALLOWED_ORIGINS.includes(origin);
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };

  socketManager.init(server, corsOptions);

  // Seed default system permissions
  const { seedSystemPermissions } = require('./config/seeder');
  await seedSystemPermissions();

  // Initialize BullMQ video processing worker
  require('./queues/video.worker');
  // Post publishing and social account sync now run via QStash webhook
  // delivery instead of BullMQ workers (see routes/webhooks/qstash.routes.js)
  // — no worker to init for either.

  // Start Token Auto-Refresh Service scheduler
  const tokenRefreshService = require('./services/social/token-refresh/token-refresh.service');
  tokenRefreshService.startScheduler();

  // Start Automated Reports Scheduler
  const reportSchedulerService = require('./services/reports/report-scheduler.service');
  reportSchedulerService.start();

  // Start Empty Content Queue Alert Scheduler
  const emptyQueueSchedulerService = require('./services/core/empty-queue-scheduler.service');
  emptyQueueSchedulerService.start();

  // Start Daily/Weekly In-App Recap Scheduler
  const recapSchedulerService = require('./services/core/recap-scheduler.service');
  recapSchedulerService.start();

  // Start Daily Posting Streak Reset Scheduler
  const streakSchedulerService = require('./services/core/streak-scheduler.service');
  streakSchedulerService.start();

  // Start Periodic Explore Feeds Refresh Scheduler (30-minute cycle)
  const feedSchedulerService = require('./services/core/feed-scheduler.service');
  feedSchedulerService.start();

  // Start Periodic Inbox Sync Scheduler (15-minute fallback cycle)
  const inboxSyncSchedulerService = require('./services/social/inbox-sync-scheduler.service');
  inboxSyncSchedulerService.start();

  // Start Periodic Social Metrics Sync Scheduler (hourly published-posts/metrics cycle)
  const socialMetricsSyncSchedulerService = require('./services/social/social-metrics-sync-scheduler.service');
  socialMetricsSyncSchedulerService.start();

  // Start Periodic Posts Sync Scheduler (15-minute published-post-list cycle, all 6 Smart-Fetch platforms)
  const postsSyncSchedulerService = require('./services/social/posts-sync-scheduler.service');
  postsSyncSchedulerService.start();

  // Start Outbox Dispatcher (polls outbox_events, delivers side-effects with retry)
  const outboxDispatcherService = require('./services/core/outbox-dispatcher.service');
  outboxDispatcherService.start();
  logger.info('Outbox dispatcher started (poll every 5s)');

  // Start Publish Reconciler (sweeps posts stuck at RETRYING whose
  // self-enqueued job got lost — #107 I7)
  const publishReconcilerService = require('./services/workspace/post/publish-reconciler.service');
  publishReconcilerService.start();
  logger.info('Publish reconciler started (poll every 5min)');
});

// ── Graceful Shutdown ───────────────────────────────────────────────────────
async function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  // Stop periodic inbox sync scheduler
  try {
    const inboxSyncSchedulerService = require('./services/social/inbox-sync-scheduler.service');
    inboxSyncSchedulerService.stop();
  } catch (err) {
    logger.error('Error stopping inbox sync scheduler', err);
  }

  // Stop periodic social metrics sync scheduler
  try {
    const socialMetricsSyncSchedulerService = require('./services/social/social-metrics-sync-scheduler.service');
    socialMetricsSyncSchedulerService.stop();
  } catch (err) {
    logger.error('Error stopping social metrics sync scheduler', err);
  }

  // Stop periodic posts sync scheduler
  try {
    const postsSyncSchedulerService = require('./services/social/posts-sync-scheduler.service');
    postsSyncSchedulerService.stop();
  } catch (err) {
    logger.error('Error stopping posts sync scheduler', err);
  }

  // Stop token refresh scheduler
  try {
    const tokenRefreshService = require('./services/social/token-refresh/token-refresh.service');
    tokenRefreshService.stopScheduler();
  } catch (err) {
    logger.error('Error stopping token refresh scheduler', err);
  }

  // Stop outbox dispatcher (before closing BullMQ/Redis/DB it depends on)
  try {
    const outboxDispatcherService = require('./services/core/outbox-dispatcher.service');
    outboxDispatcherService.stop();
  } catch (err) {
    logger.error('Error stopping outbox dispatcher', err);
  }

  // Stop publish reconciler
  try {
    const publishReconcilerService = require('./services/workspace/post/publish-reconciler.service');
    publishReconcilerService.stop();
  } catch (err) {
    logger.error('Error stopping publish reconciler', err);
  }

  server.close(async () => {
    logger.info('HTTP server closed.');

    // Đóng các worker BullMQ dứt điểm và an toàn
    try {
      const videoWorker = require('./queues/video.worker');
      logger.debug('[Shutdown] Closing BullMQ Workers...');
      await videoWorker.close();
      logger.info('BullMQ workers closed.');
    } catch (err) {
      logger.error('Error closing BullMQ workers', err);
    }

    // Đóng Redis Connection
    try {
      if (redisClient.isOpen && typeof redisClient.quit === 'function') {
        await redisClient.quit();
        logger.info('Redis connection closed.');
      }
    } catch (err) {
      logger.error('Error closing Redis connection', err);
    }

    try {
      await prisma.$disconnect();
      logger.info('Database connection closed.');
    } catch (err) {
      logger.error('Error closing database connection', err);
    }

    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ── Uncaught Exception / Rejection Handlers ────────────────────────────────
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', err);
  // Không kết thúc tiến trình đối với các lỗi tải lên không hợp lệ hoặc lỗi kết nối Cloudinary thứ cấp
  if (err && (err.http_code === 400 || err.statusCode === 400 || (err.message && (err.message.includes('Unsupported video format') || err.message.includes('Cloudinary'))))) {
    logger.warn('Non-fatal uncaught exception, server will continue running.');
    return;
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', reason instanceof Error ? { message: reason.message, stack: reason.stack } : reason);
  // Không kết thúc tiến trình đối với các lỗi tải lên không hợp lệ hoặc lỗi kết nối Cloudinary thứ cấp
  if (reason && (reason.http_code === 400 || reason.statusCode === 400 || (reason.message && (reason.message.includes('Unsupported video format') || reason.message.includes('Cloudinary'))))) {
    logger.warn('Non-fatal unhandled rejection, server will continue running.');
    return;
  }
  process.exit(1);
});


// Trigger nodemon restart to reload configuration changes from .env
