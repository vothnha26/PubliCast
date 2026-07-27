const prisma = require('../../config/prisma');
const redisClient = require('../../config/redis');
const logger = require('../../utils/logger');
const DistributedLockService = require('./distributed-lock.service');
const QuotaTrackerService = require('./quota-tracker.service');
const RedisHealthService = require('./redis-health.service');
const postMetricSyncService = require('./post-metric-sync.service');
const { upsertDailySnapshot } = require('./post-analytics-snapshot-writer');
const {
  SEED_STATUS,
  REDIS_KEYS,
  LOCK_TTL,
  YOUTUBE_QUOTA_THRESHOLD,
  PLATFORM
} = require('../../constants/analytics-snapshot.constants');

const YOUTUBE_QUOTA_SERVICE_NAME = 'youtube-analytics';

class SyncPostAnalyticsService {
  constructor() {
    this.lockService = new DistributedLockService(redisClient);
    this.quotaService = new QuotaTrackerService(redisClient);
    this.redisHealthService = new RedisHealthService(redisClient);
  }

  /**
   * Entry point called by the hourly cron alongside postMetricSyncService.syncPostMetrics().
   * Runs the daily sync, then checks whether a paused/incomplete seeding pass should resume.
   */
  async runHourlyCycle() {
    await postMetricSyncService.syncPostMetrics();
    await this.maybeRunSeeding();
  }

  /**
   * Watchdog-guarded seeding trigger. Safe to call from multiple instances/hourly
   * ticks concurrently — only one instance will actually run the seeding job at a time,
   * and a crashed/stuck seeding pass is auto-recovered after LOCK_TTL.SEED_WATCHDOG_TIMEOUT.
   */
  async maybeRunSeeding() {
    if (await this.redisHealthService.shouldFailOpen()) {
      logger.warn('[SyncPostAnalytics] Redis unavailable, skipping seeding-lock check this cycle.');
      return;
    }

    const token = await this.lockService.acquireLock(REDIS_KEYS.SEED_CHECK_LOCK, LOCK_TTL.SEED_CHECK);
    if (!token) {
      // Another instance is checking right now; nothing to do here.
      return;
    }

    try {
      const status = await redisClient.get(REDIS_KEYS.SEED_STATUS);

      if (status === SEED_STATUS.COMPLETED) {
        return;
      }

      if (status === SEED_STATUS.IN_PROGRESS) {
        const startedAt = parseInt(await redisClient.get(REDIS_KEYS.SEED_STARTED_AT), 10) || 0;
        const isStale = Date.now() - startedAt > LOCK_TTL.SEED_WATCHDOG_TIMEOUT * 1000;
        if (!isStale) {
          // Still legitimately running (possibly paused on YouTube quota) — let it continue.
          return;
        }
        logger.warn('[SyncPostAnalytics] Seeding watchdog detected a stale IN_PROGRESS status, restarting seeding.');
      }

      await this._markSeedingInProgress();
    } finally {
      await this.lockService.releaseLock(REDIS_KEYS.SEED_CHECK_LOCK, token);
    }

    await this._runSeedingJob();
  }

  async _markSeedingInProgress() {
    await redisClient.setEx(REDIS_KEYS.SEED_STATUS, LOCK_TTL.SEED_STATUS_INPROGRESS, SEED_STATUS.IN_PROGRESS);
    await redisClient.setEx(REDIS_KEYS.SEED_STARTED_AT, LOCK_TTL.SEED_STATUS_INPROGRESS, String(Date.now()));
  }

  /**
   * Seeds a baseline snapshot for every published post that has no snapshot row yet.
   * Facebook/TikTok get a single isEstimated=true baseline row for today.
   * YouTube pulls up to 90 days of real history (or since publish date if newer),
   * pausing automatically when quota runs low.
   */
  async _runSeedingJob() {
    try {
      const unseeded = await prisma.post.findMany({
        where: {
          status: 'PUBLISHED',
          isDeleted: false,
          platformPostId: { not: null },
          postAnalyticsSnapshots: { none: {} }
        }
      });

      for (const post of unseeded) {
        const paused = await this._seedSinglePost(post);
        if (paused) {
          logger.warn('[SyncPostAnalytics] Seeding paused due to YouTube quota budget, will resume next hourly cycle.');
          return;
        }
      }

      await redisClient.setEx(REDIS_KEYS.SEED_STATUS, LOCK_TTL.SEED_STATUS_INPROGRESS, SEED_STATUS.COMPLETED);
      logger.info('[SyncPostAnalytics] Seeding job completed.');
    } catch (err) {
      logger.error('[SyncPostAnalytics] Seeding job failed:', err.message);
    }
  }

  /**
   * @returns {Promise<boolean>} true if seeding should pause here (YouTube quota budget hit)
   */
  async _seedSinglePost(post) {
    let platformIdMap = {};
    try {
      platformIdMap = JSON.parse(post.platformPostId);
    } catch (e) {
      platformIdMap = { YOUTUBE: post.platformPostId };
    }
    if (!platformIdMap || typeof platformIdMap !== 'object') return false;

    const youtubeVideoId = platformIdMap.YOUTUBE || platformIdMap.youtube;
    if (youtubeVideoId) {
      const overBudget = await this.quotaService.hasExceededThreshold(
        YOUTUBE_QUOTA_SERVICE_NAME,
        100 - (YOUTUBE_QUOTA_THRESHOLD / 10000) * 100
      );
      if (overBudget) return true;

      const youtubeAnalyticsService = require('./youtube/youtube-analytics.service');
      const publishedAt = post.publishedAt || post.createdAt;
      const start = new Date(Math.max(publishedAt.getTime(), Date.now() - 90 * 24 * 60 * 60 * 1000));
      const end = new Date();
      const rows = await youtubeAnalyticsService.getVideoAnalytics(
        post.brandId,
        youtubeVideoId,
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0]
      );

      // isFallback rows come from a failed/quota-blocked API call masked as zeros —
      // persisting them as isEstimated=false would look like confirmed 0-view days.
      for (const row of rows) {
        if (row.isFallback) continue;
        await upsertDailySnapshot({
          postId: post.id,
          platformPostId: youtubeVideoId,
          brandId: post.brandId,
          platform: PLATFORM.YOUTUBE,
          date: row.date,
          metrics: { views: row.views, reach: 0, clicks: 0, reactions: row.likes || 0 },
          isEstimated: false
        });
      }
      return false;
    }

    const facebookPostId = platformIdMap.FACEBOOK || platformIdMap.facebook;
    const tiktokVideoId = platformIdMap.TIKTOK || platformIdMap.tiktok;
    const platformPostId = facebookPostId || tiktokVideoId;
    const platform = facebookPostId ? PLATFORM.FACEBOOK : (tiktokVideoId ? PLATFORM.TIKTOK : null);
    if (!platformPostId || !platform) return false;

    try {
      const facebookPostService = require('./facebook/facebook-post.service');
      const details = platform === PLATFORM.FACEBOOK
        ? await facebookPostService.getPostDetails(post.brandId, platformPostId)
        : null;

      await upsertDailySnapshot({
        postId: post.id,
        platformPostId,
        brandId: post.brandId,
        platform,
        date: new Date(),
        metrics: details
          ? { views: details.views, reach: details.reach, clicks: details.clicks, reactions: details.reactions?.total || 0 }
          : { views: 0, reach: 0, clicks: 0, reactions: 0 },
        isEstimated: true
      });
    } catch (err) {
      logger.error(`[SyncPostAnalytics] Baseline seed failed for post ${post.id}:`, err.message);
    }
    return false;
  }

  /**
   * Called when a brand disconnects a social account — removes snapshot rows
   * that are now orphaned for that brand+platform combination.
   */
  async cleanupOrphanSnapshotsForBrandPlatform(brandId, platform) {
    const result = await prisma.postAnalyticsDailySnapshot.deleteMany({
      where: { brandId, platform }
    });
    logger.info(`[SyncPostAnalytics] Removed ${result.count} orphaned snapshot rows for brand ${brandId} / ${platform}.`);
    return result.count;
  }

  /**
   * Weekly sweep: removes snapshot rows with no linked Post whose owning
   * SocialAccount is no longer active (channel was unlinked after the post's
   * own row was already deleted, or the row was never linked to a Post).
   */
  async cleanupStaleUnlinkedSnapshots() {
    const orphanRows = await prisma.postAnalyticsDailySnapshot.findMany({
      where: { postId: null },
      select: { id: true, brandId: true, platform: true }
    });

    if (orphanRows.length === 0) return 0;

    const activeBrandPlatforms = new Set(
      (await prisma.socialAccount.findMany({
        where: { isConnected: true },
        select: { brandId: true, platform: true }
      })).map(a => `${a.brandId}:${a.platform}`)
    );

    const staleIds = orphanRows
      .filter(row => !activeBrandPlatforms.has(`${row.brandId}:${row.platform}`))
      .map(row => row.id);

    if (staleIds.length === 0) return 0;

    const result = await prisma.postAnalyticsDailySnapshot.deleteMany({
      where: { id: { in: staleIds } }
    });
    logger.info(`[SyncPostAnalytics] Weekly sweep removed ${result.count} stale unlinked snapshot rows.`);
    return result.count;
  }
}

module.exports = new SyncPostAnalyticsService();
