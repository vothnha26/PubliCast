const { Worker } = require('bullmq');
const { defaultConnection } = require('../config/bullmq');
const { QUEUE_CONFIG } = require('../constants/video-publish.constants');
const socialPlatformFactory = require('../services/social/social-platform.factory');
const socialAccountRepository = require('../repositories/social/social-account.repository');
const redisClient = require('../config/redis');
const DistributedLockService = require('../services/social/distributed-lock.service');
const QuotaTrackerService = require('../services/social/quota-tracker.service');
const { upsertDailySnapshot } = require('../services/social/post-analytics-snapshot-writer');
const { REDIS_KEY_BUILDERS, LOCK_TTL, YOUTUBE_QUOTA_THRESHOLD, PLATFORM } = require('../constants/analytics-snapshot.constants');
const { socialQueue } = require('./social.queue');

const lockService = new DistributedLockService(redisClient);
const quotaService = new QuotaTrackerService(redisClient);
const YOUTUBE_QUOTA_SERVICE_NAME = 'youtube-analytics';

/**
 * BullMQ Worker for Social Account Data Sync
 */
const socialWorker = new Worker(QUEUE_CONFIG.SOCIAL.NAME, async (job) => {
  if (job.name === QUEUE_CONFIG.SOCIAL.JOB_BACKFILL_POST_ANALYTICS) {
    return handleBackfillPostAnalytics(job);
  }

  if (job.name === QUEUE_CONFIG.SOCIAL.JOB_SYNC) {
    const { socialAccountId, platform, brandId } = job.data;
    
    console.log(`[Social Worker] Starting job ${job.id} for platform: ${platform}, account: ${socialAccountId}`);
    
    // Cập nhật trạng thái đồng bộ sang PARTIAL (Đã có Profile, đang sync Analytics)
    await socialAccountRepository.updateSyncStatus(socialAccountId, 'PARTIAL');

    try {
      const service = socialPlatformFactory.getService(platform);
      
      // Đồng bộ dữ liệu 3 tháng (90 ngày) gần nhất
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      await service.syncChannelMetrics(socialAccountId, startDate, endDate);
      
      // Cập nhật trạng thái SUCCESS và thời gian đồng bộ cuối cùng
      await socialAccountRepository.updateSyncStatus(socialAccountId, 'SUCCESS');
      await socialAccountRepository.updateLastSyncAt(socialAccountId);
      
      console.log(`[Social Worker] Successfully synced metrics for account: ${socialAccountId}`);
    } catch (err) {
      // Cập nhật trạng thái FAILED
      await socialAccountRepository.updateSyncStatus(socialAccountId, 'FAILED');
      
      // An toàn logs: Chỉ log các trường an toàn, TUYỆT ĐỐI không in object job.data hay tokens ra logs
      console.error(`[Social Worker] Failed to sync metrics for platform: ${platform}, account: ${socialAccountId}. Error: ${err.message}`);
      
      throw err; // Ném lỗi để BullMQ kích hoạt cơ chế retry (Exponential Backoff)
    }
  } else {
    throw new Error(`Unhandled job type: ${job.name} in Social Worker`);
  }
}, {
  ...defaultConnection,
  concurrency: 3 // Chỉ mở tối đa 3 connection song song để bảo vệ connection pool của database
});

// Event Listeners cho giám sát
socialWorker.on('completed', (job) => {
  console.log(`[Social Worker] Job ${job.id} completed!`);
});

socialWorker.on('failed', (job, err) => {
  // An toàn logs: không log thông tin nhạy cảm của job.data
  console.error(`[Social Worker] Job ${job.id} failed. Error: ${err.message}`);
});

/**
 * Backfills up to 90 days (or since publish date, whichever is shorter) of real
 * YouTube history for a single video into PostAnalyticsDailySnapshot.
 * Guarded by backfillLock (skip if another instance/request already enqueued
 * a backfill for this platformPostId) and by YouTube quota budget (re-enqueue
 * with a delay until next PT midnight reset if quota is running low).
 */
async function handleBackfillPostAnalytics(job) {
  const { postId, platformPostId, brandId, publishedAt } = job.data;

  const overBudget = await quotaService.hasExceededThreshold(
    YOUTUBE_QUOTA_SERVICE_NAME,
    100 - (YOUTUBE_QUOTA_THRESHOLD / 10000) * 100
  );
  if (overBudget) {
    const delayMs = quotaService.calculateTTLToPT() * 1000;
    console.log(`[Social Worker] YouTube quota budget low, postponing backfill for ${platformPostId} by ${Math.round(delayMs / 1000)}s.`);
    await socialQueue.add(QUEUE_CONFIG.SOCIAL.JOB_BACKFILL_POST_ANALYTICS, job.data, { delay: delayMs });
    return;
  }

  const lockKey = REDIS_KEY_BUILDERS.backfillLock(platformPostId);
  const token = await lockService.acquireLock(lockKey, LOCK_TTL.BACKFILL);
  if (!token) {
    console.log(`[Social Worker] Backfill already in progress for ${platformPostId}, skipping duplicate job.`);
    return;
  }

  try {
    const youtubeAnalyticsService = require('../services/social/youtube/youtube-analytics.service');
    const publishedAtDate = publishedAt ? new Date(publishedAt) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const start = new Date(Math.max(publishedAtDate.getTime(), Date.now() - 90 * 24 * 60 * 60 * 1000));
    const end = new Date();

    const rows = await youtubeAnalyticsService.getVideoAnalytics(
      brandId,
      platformPostId,
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );

    // isFallback rows come from a failed/quota-blocked API call masked as zeros —
    // persisting them as isEstimated=false would look like confirmed 0-view days.
    for (const row of rows) {
      if (row.isFallback) continue;
      await upsertDailySnapshot({
        postId: postId || null,
        platformPostId,
        brandId,
        platform: PLATFORM.YOUTUBE,
        date: row.date,
        metrics: { views: row.views, reach: 0, clicks: 0, reactions: row.likes || 0 },
        isEstimated: false
      });
    }

    console.log(`[Social Worker] Backfill completed for ${platformPostId} (${rows.length} days).`);
  } finally {
    await lockService.releaseLock(lockKey, token);
  }
}

module.exports = socialWorker;
module.exports.handleBackfillPostAnalytics = handleBackfillPostAnalytics;
