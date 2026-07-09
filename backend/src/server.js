require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const prisma = require('./config/prisma');

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

  // Initialize BullMQ publish worker
  require('./queues/publish.worker');

  // Start Discord daily member snapshot (runs every 24h)
  const discordStatsService = require('./services/social/discord/discord-stats.service');
  // Run once at startup (with small delay to let DB settle)
  setTimeout(() => discordStatsService.snapshotAllGuilds().catch(() => {}), 30_000);
  // Then every 24 hours
  setInterval(() => discordStatsService.snapshotAllGuilds().catch(() => {}), 24 * 60 * 60 * 1000);
  logger.info('Discord daily snapshot scheduler started (every 24h)');

  // Start Post interaction metrics snapshot (runs every 1h)
  const postMetricSyncService = require('./services/social/post-metric-sync.service');
  // Run once at startup (with delay to let DB settle)
  setTimeout(() => postMetricSyncService.syncPostMetrics().catch(() => {}), 45_000);
  // Then every 1 hour
  setInterval(() => postMetricSyncService.syncPostMetrics().catch(() => {}), 1 * 60 * 60 * 1000);
  logger.info('Post metrics sync scheduler started (every 1h)');

});

// ── Graceful Shutdown ───────────────────────────────────────────────────────
async function shutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed.');

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

