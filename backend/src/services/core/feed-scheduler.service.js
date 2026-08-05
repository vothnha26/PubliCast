const cron = require('node-cron');
const redisClient = require('../../config/redis');
const DistributedLockService = require('../social/distributed-lock.service');
const feedService = require('../workspace/feed.service');
const { LOCK_CONFIG } = require('../../utils/constants');
const logger = require('../../utils/logger');

const lockService = new DistributedLockService(redisClient);

class FeedSchedulerService {
  constructor() {
    this.job = null;
  }

  start() {
    // Every 30 minutes — RSS feeds don't need near-real-time freshness, and
    // this keeps the fetch volume reasonable across every FeedSource.
    this.job = cron.schedule('*/30 * * * *', async () => {
      logger.debug('⏰ [FeedScheduler] Starting feed refresh...');
      try {
        await lockService.acquireLock(LOCK_CONFIG.FEED_SCHEDULER.KEY, LOCK_CONFIG.FEED_SCHEDULER.TTL_SEC)
          .then(async (token) => {
            if (!token) {
              logger.debug('ℹ️ [FeedScheduler] Another instance is already running, skipping.');
              return;
            }
            try {
              const result = await feedService.refreshAllFeedSources();
              logger.debug(`✅ [FeedScheduler] Refreshed ${result.succeeded}/${result.total} feed source(s), ${result.failed} failed.`);
            } finally {
              await lockService.releaseLock(LOCK_CONFIG.FEED_SCHEDULER.KEY, token);
            }
          });
      } catch (error) {
        console.error('❌ [FeedScheduler] Error running feed refresh:', error);
      }
    });

    logger.debug('✅ [FeedScheduler] Cron service initialized (every 30 minutes).');
  }

  stop() {
    if (this.job) { this.job.stop(); this.job = null; }
  }
}

module.exports = new FeedSchedulerService();
