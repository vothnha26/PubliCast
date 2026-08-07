const cron = require('node-cron');
const redisClient = require('../../config/redis');
const DistributedLockService = require('./distributed-lock.service');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const { qstashClient } = require('../../config/qstash');
const logger = require('../../utils/logger');
const { LOCK_CONFIG, ANALYTICS } = require('../../utils/constants');

const lockService = new DistributedLockService(redisClient);

// Cap on how many due accounts one scan claims — QStash's flowControl below
// bounds concurrent delivery regardless, but this also bounds how large a
// single DB read + publish batch gets per cron tick.
const SCAN_BATCH_SIZE = 500;

/**
 * SocialMetricsSyncSchedulerService
 * Periodic background scheduler that queues channel-metrics sync for
 * connected social accounts past their sync cooldown.
 *
 * Previously this force-synced (bypassing SyncCacheProxy's own cooldown
 * check) every account of every active brand, sequentially, once an hour,
 * awaited directly inside the cron callback in the main process. That
 * spiked platform API calls at the top of every hour regardless of how
 * recently each account had actually synced, and blocked the process for
 * however long the full sequential pass took.
 *
 * Now the cron only queries SocialAccount.lastSyncAt to find accounts
 * actually due (respecting ANALYTICS.COOLDOWN_HOURS, same threshold
 * SyncCacheProxy already enforces per-request) and publishes one QStash
 * message per due account to the metrics-sync webhook. QStash's flowControl
 * caps how many sync calls run concurrently — if a large batch of accounts
 * all fall due at once (e.g. after downtime), delivery is throttled instead
 * of hitting platform APIs / the DB pool all at once — and failed syncs
 * retry independently per account instead of one broken account's error
 * being swallowed inside a shared try/catch.
 */
class SocialMetricsSyncSchedulerService {
  constructor() {
    this.job = null;
    this.cronSchedule = '*/15 * * * *'; // Runs every 15 minutes
  }

  start() {
    if (this.job) {
      logger.warn('[SocialMetricsSyncScheduler] Service is already running.');
      return;
    }

    this.job = cron.schedule(this.cronSchedule, async () => {
      logger.info('⏰ [SocialMetricsSyncScheduler] Starting metrics-sync scan...');
      try {
        await this.runSyncWithLock();
      } catch (error) {
        logger.error('❌ [SocialMetricsSyncScheduler] Error executing scan:', error);
      }
    });

    logger.info('✅ [SocialMetricsSyncScheduler] Cron service initialized (Schedule: Every 15 minutes).');
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
      logger.info('ℹ️ [SocialMetricsSyncScheduler] Another cluster instance is already scanning, skipping.');
      return;
    }

    try {
      await this.queueDueAccounts();
    } finally {
      await lockService.releaseLock(KEY, token);
    }
  }

  async queueDueAccounts() {
    const dueAccounts = await socialAccountRepository.findDueForMetricsSync(
      ANALYTICS.COOLDOWN_HOURS,
      SCAN_BATCH_SIZE
    );

    if (dueAccounts.length === 0) {
      logger.info('ℹ️ [SocialMetricsSyncScheduler] No accounts due for sync.');
      return;
    }

    logger.info(`🔍 [SocialMetricsSyncScheduler] Queuing ${dueAccounts.length} account(s) due for sync...`);

    let queued = 0;
    for (const account of dueAccounts) {
      try {
        await qstashClient.publishJSON({
          url: `${process.env.BACKEND_BASE_URL}/api/webhooks/qstash/metrics-sync`,
          body: { socialAccountId: account.id, platform: account.platform },
          // Scoped to a coarse time bucket (not per-run) so a scan that
          // re-claims the same still-due account before it's synced doesn't
          // pile up duplicate deliveries for it within the same cooldown window.
          deduplicationId: `metrics-sync-${account.id}-${Math.floor(Date.now() / (15 * 60 * 1000))}`,
          // Caps concurrent metrics-sync deliveries across ALL accounts,
          // regardless of how many fall due in this scan — the actual guard
          // against a large due-batch flooding platform APIs / the DB pool.
          flowControl: { key: 'social-metrics-sync', parallelism: 20 },
          retries: 3
        });
        queued++;
      } catch (err) {
        logger.warn(`⚠️ [SocialMetricsSyncScheduler] Failed to queue sync for account ${account.id} (${account.platform}): ${err.message}`);
      }
    }

    logger.info(`✅ [SocialMetricsSyncScheduler] Queued ${queued}/${dueAccounts.length} account(s).`);
  }
}

module.exports = new SocialMetricsSyncSchedulerService();
