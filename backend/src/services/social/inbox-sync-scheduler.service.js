const cron = require('node-cron');
const inboxService = require('./inbox.service');
const prisma = require('../../config/prisma');
const redisClient = require('../../config/redis');
const DistributedLockService = require('./distributed-lock.service');
const socketManager = require('../workspace/socket/socket.manager');
const logger = require('../../utils/logger');
const { LOCK_CONFIG } = require('../../utils/constants');

const lockService = new DistributedLockService(redisClient);

/**
 * InboxSyncSchedulerService
 * Periodic Background Scheduler to automatically sync inbox comments and messages
 * from connected social platforms (YouTube, TikTok, Facebook, Instagram) every 15 minutes.
 * Acts as a resilient fallback mechanism if real-time webhooks fail or drop.
 */
class InboxSyncSchedulerService {
  constructor() {
    this.job = null;
    this.cronSchedule = '*/15 * * * *'; // Runs every 15 minutes
  }

  /**
   * Start the periodic 15-minute cron job
   */
  start() {
    if (this.job) {
      logger.warn('[InboxSyncScheduler] Service is already running.');
      return;
    }

    this.job = cron.schedule(this.cronSchedule, async () => {
      logger.info('⏰ [InboxSyncScheduler] Starting periodic 15-minute inbox sync...');
      try {
        await this.runSyncWithLock();
      } catch (error) {
        logger.error('❌ [InboxSyncScheduler] Error executing periodic sync:', error);
      }
    });

    logger.info('✅ [InboxSyncScheduler] Cron service initialized (Schedule: Every 15 minutes).');
  }

  /**
   * Stop the scheduled cron job
   */
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info('🛑 [InboxSyncScheduler] Cron service stopped.');
    }
  }

  /**
   * Guard sync process with a distributed Redis lock to prevent duplicate execution across cluster instances
   */
  async runSyncWithLock() {
    const { KEY, TTL_SEC } = LOCK_CONFIG.INBOX_SYNC_SCHEDULER;
    const token = await lockService.acquireLock(KEY, TTL_SEC);

    if (!token) {
      logger.info('ℹ️ [InboxSyncScheduler] Another cluster instance is already executing the periodic inbox sync, skipping.');
      return;
    }

    try {
      await this.syncAllActiveBrands();
    } finally {
      await lockService.releaseLock(KEY, token);
    }
  }

  /**
   * Scan all brands with connected social accounts and sync inbox comments/messages
   */
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
      logger.info('ℹ️ [InboxSyncScheduler] No active brands with connected social accounts found.');
      return;
    }

    logger.info(`🔍 [InboxSyncScheduler] Scanning ${activeBrands.length} active brand(s)...`);

    for (const brand of activeBrands) {
      if (!brand.socialAccounts || brand.socialAccounts.length === 0) {
        continue;
      }

      // Collect unique platforms for this brand
      const platforms = [...new Set(brand.socialAccounts.map(sa => sa.platform))];

      for (const platform of platforms) {
        try {
          // 1. Sync Inbox Comments & Messages
          const syncedItems = await inboxService.syncPlatformComments(brand.id, platform);
          
          if (syncedItems && syncedItems.length > 0) {
            logger.info(`✅ [InboxSyncScheduler] Synced ${syncedItems.length} item(s) for brand '${brand.name}' (${platform}).`);
            
            // Broadcast socket notification to connected clients in brand room
            socketManager.broadcastToBrandRoom(brand.id, 'INBOX_UPDATED', {
              platform,
              syncedCount: syncedItems.length,
              timestamp: new Date().toISOString()
            });
          }

          // 2. Sync Published Posts & Channel Metrics from Social Platforms
          const socialService = require('./social.service');
          await socialService.getAggregatedMetrics(brand.id, null, null, true).catch(err => {
            logger.warn(`⚠️ [InboxSyncScheduler] Channel metrics & posts sync warning for brand '${brand.name}': ${err.message}`);
          });
          logger.info(`✅ [InboxSyncScheduler] Synced published posts & metrics for brand '${brand.name}' (${platform}).`);
        } catch (err) {
          logger.error(`❌ [InboxSyncScheduler] Failed to sync ${platform} for brand '${brand.name}' (${brand.id}):`, err.message);
        }
      }
    }
  }
}

module.exports = new InboxSyncSchedulerService();
