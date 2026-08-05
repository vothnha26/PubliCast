const cron = require('node-cron');
const prisma = require('../../config/prisma');
const redisClient = require('../../config/redis');
const DistributedLockService = require('../social/distributed-lock.service');
const notificationService = require('./notification.service');
const { LOCK_CONFIG, NOTIFICATION_TYPES, POST_STATUS } = require('../../utils/constants');
const logger = require('../../utils/logger');

const lockService = new DistributedLockService(redisClient);

// Once a week per brand rather than daily — an empty queue is a steady
// state a lot of brands sit in intentionally (posting ad hoc, not on a
// schedule), so a daily alert would just be noise. A stale notification
// row from < 7 days ago is treated as "already alerted, skip".
const REALERT_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

class EmptyQueueSchedulerService {
  constructor() {
    this.job = null;
  }

  start() {
    // Run daily at 09:00 AM — after ReportScheduler's 08:00 run, same idle
    // hour bucket as the other daily scans.
    this.job = cron.schedule('0 9 * * *', async () => {
      logger.debug('⏰ [EmptyQueueScheduler] Starting daily empty-queue scan...');
      try {
        await this.runScanWithLock();
      } catch (error) {
        console.error('❌ [EmptyQueueScheduler] Error running scheduled task:', error);
      }
    });

    logger.debug('✅ [EmptyQueueScheduler] Cron service initialized (Running daily at 09:00 AM).');
  }

  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
    }
  }

  async runScanWithLock() {
    const { KEY, TTL_SEC } = LOCK_CONFIG.EMPTY_QUEUE_SCHEDULER;
    const token = await lockService.acquireLock(KEY, TTL_SEC);
    if (!token) {
      logger.debug('ℹ️ [EmptyQueueScheduler] Another instance is already running, skipping.');
      return;
    }

    try {
      await this.scanAndNotify();
    } finally {
      await lockService.releaseLock(KEY, token);
    }
  }

  async scanAndNotify() {
    const brands = await prisma.brand.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true }
    });

    if (brands.length === 0) return;

    const pending = brands.map((brand) => this._checkBrand(brand).catch((err) => {
      console.error(`❌ [EmptyQueueScheduler] Failed to check brand ${brand.id}:`, err.message);
    }));

    await Promise.all(pending);
  }

  async _checkBrand(brand) {
    const scheduledCount = await prisma.post.count({
      where: { brandId: brand.id, status: POST_STATUS.SCHEDULED, isDeleted: false }
    });
    if (scheduledCount > 0) return;

    const recentAlert = await prisma.systemNotification.findFirst({
      where: {
        brandId: brand.id,
        type: NOTIFICATION_TYPES.CONTENT,
        title: 'Empty content queue',
        createdAt: { gte: new Date(Date.now() - REALERT_INTERVAL_MS) }
      }
    });
    if (recentAlert) return;

    await notificationService.notifyBrandMembers(brand.id, {
      type: NOTIFICATION_TYPES.CONTENT,
      title: 'Empty content queue',
      message: `"${brand.name}" has no scheduled posts. Add some to keep your channels active.`,
      actionUrl: '/planner'
    }, 'notifyEmptyQueue');
  }
}

module.exports = new EmptyQueueSchedulerService();
