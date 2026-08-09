const cron = require('node-cron');
const redisClient = require('../../config/redis');
const DistributedLockService = require('./distributed-lock.service');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const { qstashClient } = require('../../config/qstash');
const logger = require('../../utils/logger');
const { LOCK_CONFIG, ANALYTICS, PLATFORMS } = require('../../utils/constants');

const lockService = new DistributedLockService(redisClient);

// Every platform whose getPublishedVideos/getPublishedPosts read path was
// converted to DB-only (Smart Fetch) — the only platforms this scheduler
// needs to keep PostMetricDaily fresh for.
const SYNCED_PLATFORMS = [
  PLATFORMS.YOUTUBE,
  PLATFORMS.FACEBOOK,
  PLATFORMS.INSTAGRAM,
  PLATFORMS.THREADS,
  PLATFORMS.TIKTOK,
  PLATFORMS.BLUESKY
];

// Cap on how many due accounts one scan claims — QStash's flowControl below
// bounds concurrent delivery regardless, but this also bounds how large a
// single DB read + publish batch gets per cron tick.
const SCAN_BATCH_SIZE = 500;

/**
 * PostsSyncSchedulerService
 * Periodic scheduler that queues a published-post-list resync for connected
 * social accounts (across all 6 Smart-Fetch platforms) past their own
 * lastPostsSyncAt cooldown. Generalizes the former YouTube-only
 * YouTubePostsSyncSchedulerService — same QStash-dispatch shape: the cron
 * only scans for due accounts and publishes one message per account, so
 * QStash's flowControl caps actual concurrent platform API calls instead of
 * looping in-process. The actual live-fetch-and-persist work happens in each
 * platform's syncPublishedPosts()/syncPublishedVideos(), dispatched via
 * socialPlatformFactory from the shared QStash webhook handler.
 */
class PostsSyncSchedulerService {
  constructor() {
    this.job = null;
    this.cronSchedule = '*/15 * * * *'; // Runs every 15 minutes
  }

  start() {
    if (this.job) {
      logger.warn('[PostsSyncScheduler] Service is already running.');
      return;
    }

    this.job = cron.schedule(this.cronSchedule, async () => {
      logger.info('⏰ [PostsSyncScheduler] Starting posts-sync scan...');
      try {
        await this.runSyncWithLock();
      } catch (error) {
        logger.error('❌ [PostsSyncScheduler] Error executing scan:', error);
      }
    });

    logger.info('✅ [PostsSyncScheduler] Cron service initialized (Schedule: Every 15 minutes).');
  }

  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info('🛑 [PostsSyncScheduler] Cron service stopped.');
    }
  }

  async runSyncWithLock() {
    const { KEY, TTL_SEC } = LOCK_CONFIG.POSTS_SYNC_SCHEDULER;
    const token = await lockService.acquireLock(KEY, TTL_SEC);

    if (!token) {
      logger.info('ℹ️ [PostsSyncScheduler] Another cluster instance is already scanning, skipping.');
      return;
    }

    try {
      await this.queueDueAccounts();
    } finally {
      await lockService.releaseLock(KEY, token);
    }
  }

  async queueDueAccounts() {
    for (const platform of SYNCED_PLATFORMS) {
      await this._queueDueAccountsForPlatform(platform);
    }
  }

  async _queueDueAccountsForPlatform(platform) {
    const dueAccounts = await socialAccountRepository.findDueForPostsSync(
      ANALYTICS.COOLDOWN_HOURS,
      SCAN_BATCH_SIZE,
      platform
    );

    if (dueAccounts.length === 0) {
      logger.info(`ℹ️ [PostsSyncScheduler] No ${platform} accounts due for sync.`);
      return;
    }

    logger.info(`🔍 [PostsSyncScheduler] Queuing ${dueAccounts.length} ${platform} account(s) due for sync...`);

    let queued = 0;
    for (const account of dueAccounts) {
      try {
        await qstashClient.publishJSON({
          url: `${process.env.BACKEND_BASE_URL}/api/webhooks/qstash/posts-sync`,
          body: { socialAccountId: account.id, platform: account.platform, brandId: account.brandId },
          // Scoped to a coarse time bucket (not per-run) so a scan that
          // re-claims the same still-due account before it's synced doesn't
          // pile up duplicate deliveries for it within the same cooldown window.
          deduplicationId: `posts-sync-${account.id}-${Math.floor(Date.now() / (15 * 60 * 1000))}`,
          // Caps concurrent posts-sync deliveries across ALL accounts of this
          // platform, regardless of how many fall due in this scan.
          flowControl: { key: `posts-sync-${platform.toLowerCase()}`, parallelism: 20 },
          retries: 3
        });
        queued++;
      } catch (err) {
        logger.warn(`⚠️ [PostsSyncScheduler] Failed to queue sync for account ${account.id}: ${err.message}`);
      }
    }

    logger.info(`✅ [PostsSyncScheduler] Queued ${queued}/${dueAccounts.length} ${platform} account(s).`);
  }
}

module.exports = new PostsSyncSchedulerService();
