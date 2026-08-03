const cron = require('node-cron');
const prisma = require('../../config/prisma');
const redisClient = require('../../config/redis');
const DistributedLockService = require('./distributed-lock.service');
const socialService = require('./social.service');
const logger = require('../../utils/logger');
const { LOCK_CONFIG } = require('../../utils/constants');

const lockService = new DistributedLockService(redisClient);

/**
 * SocialMetricsSyncSchedulerService
 * Periodic background scheduler that syncs published posts + channel metrics
 * from connected social platforms every hour.
 *
 * Split out of InboxSyncSchedulerService, which used to run this same
 * forceSync=true metrics pass every 15 minutes (the same cadence as comment
 * sync) for every brand/platform regardless of whether anyone was actually
 * viewing the Inbox — view/like/comment counts don't need to be fresher than
 * an hour (matches the TrackedVideo/getVideoDetails() read-through cache
 * TTL), so this runs on its own, slower cycle instead.
 */
class SocialMetricsSyncSchedulerService {
  constructor() {
    this.job = null;
    this.cronSchedule = '0 * * * *'; // Runs at the top of every hour
  }

  start() {
    if (this.job) {
      logger.warn('[SocialMetricsSyncScheduler] Service is already running.');
      return;
    }

    this.job = cron.schedule(this.cronSchedule, async () => {
      logger.info('⏰ [SocialMetricsSyncScheduler] Starting hourly published posts & metrics sync...');
      try {
        await this.runSyncWithLock();
      } catch (error) {
        logger.error('❌ [SocialMetricsSyncScheduler] Error executing hourly sync:', error);
      }
    });

    logger.info('✅ [SocialMetricsSyncScheduler] Cron service initialized (Schedule: Every hour).');
  }

  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info('🛑 [SocialMetricsSyncScheduler] Cron service stopped.');
    }
  }

  async runSyncWithLock() {
    const { KEY, TTL_SEC } = LOCK_CONFIG.SOCIAL_METRICS_SYNC_SCHEDULER;
    const token = await lockService.acquireLock(KEY, TTL_SEC);

    if (!token) {
      logger.info('ℹ️ [SocialMetricsSyncScheduler] Another cluster instance is already executing the hourly sync, skipping.');
      return;
    }

    try {
      await this.syncAllActiveBrands();
    } finally {
      await lockService.releaseLock(KEY, token);
    }
  }

  async syncAllActiveBrands() {
    const activeBrands = await prisma.brand.findMany({
      select: {
        id: true,
        name: true,
        socialAccounts: {
          where: { isConnected: true },
          select: { platform: true }
        }
      }
    });

    if (!activeBrands || activeBrands.length === 0) {
      logger.info('ℹ️ [SocialMetricsSyncScheduler] No active brands with connected social accounts found.');
      return;
    }

    logger.info(`🔍 [SocialMetricsSyncScheduler] Scanning ${activeBrands.length} active brand(s)...`);

    for (const brand of activeBrands) {
      if (!brand.socialAccounts || brand.socialAccounts.length === 0) {
        continue;
      }

      const platforms = [...new Set(brand.socialAccounts.map(sa => sa.platform))];

      for (const platform of platforms) {
        try {
          await socialService.getAggregatedMetrics(brand.id, null, null, true);
          logger.info(`✅ [SocialMetricsSyncScheduler] Synced published posts & metrics for brand '${brand.name}' (${platform}).`);
        } catch (err) {
          logger.warn(`⚠️ [SocialMetricsSyncScheduler] Channel metrics & posts sync warning for brand '${brand.name}' (${platform}): ${err.message}`);
        }
      }
    }
  }
}

module.exports = new SocialMetricsSyncSchedulerService();
