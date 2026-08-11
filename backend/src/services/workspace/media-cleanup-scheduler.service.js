const cron = require('node-cron');
const lockService = require('../social/distributed-lock.singleton');
const mediaLibraryRepository = require('../../repositories/workspace/media-library.repository');
const { qstashClient } = require('../../config/qstash');
const logger = require('../../utils/logger');
const { LOCK_CONFIG } = require('../../utils/constants');

const SCAN_BATCH_SIZE = 500;
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * MediaCleanupSchedulerService
 * Periodic background scheduler that reclaims Cloudinary/local storage for
 * media uploaded through the composer but never attached to a post — since
 * upload now happens as soon as a file is selected (not deferred to
 * Submit), a file the user picks and then removes, or a composer session
 * that's abandoned without going through closePostCreator's rollback
 * (crashed tab, browser killed), leaves a MediaLibrary row with
 * isUsed=false and a live Cloudinary asset with no other cleanup path.
 *
 * Mirrors SocialMetricsSyncSchedulerService's shape: the cron only scans for
 * candidates (isUsed=false, older than the orphan-age cutoff) and publishes
 * one QStash message per candidate to the media-cleanup webhook — the
 * actual Cloudinary destroy + DB delete happens there, race-checked against
 * isUsed flipping true between scan and delivery (see
 * mediaLibraryService.deleteOrphanMediaAsset). QStash's flowControl caps how
 * many deletes run concurrently regardless of how large a batch falls due.
 */
class MediaCleanupSchedulerService {
  constructor() {
    this.job = null;
    this.cronSchedule = '0 * * * *'; // Runs once every hour, on the hour
  }

  start() {
    if (this.job) {
      logger.warn('[MediaCleanupScheduler] Service is already running.');
      return;
    }

    this.job = cron.schedule(this.cronSchedule, async () => {
      logger.info('⏰ [MediaCleanupScheduler] Starting orphan media scan...');
      try {
        await this.runScanWithLock();
      } catch (error) {
        logger.error('❌ [MediaCleanupScheduler] Error executing scan:', error);
      }
    });

    logger.info('✅ [MediaCleanupScheduler] Cron service initialized (Schedule: Every hour).');
  }

  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info('🛑 [MediaCleanupScheduler] Cron service stopped.');
    }
  }

  async runScanWithLock() {
    const { KEY, TTL_SEC } = LOCK_CONFIG.MEDIA_CLEANUP_SCHEDULER;
    const token = await lockService.acquireLock(KEY, TTL_SEC);

    if (!token) {
      logger.info('ℹ️ [MediaCleanupScheduler] Another cluster instance is already scanning, skipping.');
      return;
    }

    try {
      await this.queueOrphanCandidates();
    } finally {
      await lockService.releaseLock(KEY, token);
    }
  }

  async queueOrphanCandidates() {
    const cutoff = new Date(Date.now() - ORPHAN_AGE_MS);
    const candidates = await mediaLibraryRepository.findOrphanCandidates(cutoff, SCAN_BATCH_SIZE);

    if (candidates.length === 0) {
      logger.info('ℹ️ [MediaCleanupScheduler] No orphan media found.');
      return;
    }

    logger.info(`🔍 [MediaCleanupScheduler] Queuing ${candidates.length} orphan media candidate(s) for cleanup...`);

    let queued = 0;
    for (const media of candidates) {
      try {
        await qstashClient.publishJSON({
          url: `${process.env.BACKEND_BASE_URL}/api/webhooks/qstash/media-cleanup`,
          body: { mediaLibraryId: media.id, brandId: media.brandId },
          // The row's id doesn't change between scans, unlike the per-account
          // time-bucketed dedup metrics-sync uses — one message per id is
          // enough since the 24h orphan window is far coarser than the
          // hourly scan cadence.
          deduplicationId: `media-cleanup-${media.id}`,
          flowControl: { key: 'media-cleanup', parallelism: 20 },
          retries: 3
        });
        queued++;
      } catch (err) {
        logger.warn(`⚠️ [MediaCleanupScheduler] Failed to queue cleanup for media ${media.id}: ${err.message}`);
      }
    }

    logger.info(`✅ [MediaCleanupScheduler] Queued ${queued}/${candidates.length} orphan media candidate(s).`);
  }
}

module.exports = new MediaCleanupSchedulerService();
