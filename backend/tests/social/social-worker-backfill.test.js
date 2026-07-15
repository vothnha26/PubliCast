/**
 * BullMQ Backfill Job Tests — social.worker.js#handleBackfillPostAnalytics
 *
 * Verifies:
 * 1. Dedup: backfillLock not acquired -> skip without calling the YouTube API
 * 2. Quota re-enqueue: over budget -> re-enqueues with a PT-midnight delay, no API call
 * 3. Persists rows via upsertDailySnapshot and skips isFallback rows
 * 4. Always releases the lock, even when the analytics fetch throws
 */

jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
  Queue: jest.fn().mockImplementation(() => ({ add: jest.fn() }))
}));
jest.mock('../../src/config/redis', () => ({}));
jest.mock('../../src/repositories/social/social-account.repository', () => ({
  updateSyncStatus: jest.fn(),
  updateLastSyncAt: jest.fn()
}));
jest.mock('../../src/services/social/social-platform.factory', () => ({
  getService: jest.fn()
}));
jest.mock('../../src/services/social/distributed-lock.service', () => {
  return jest.fn().mockImplementation(() => ({
    acquireLock: jest.fn(),
    releaseLock: jest.fn()
  }));
});
jest.mock('../../src/services/social/quota-tracker.service', () => {
  return jest.fn().mockImplementation(() => ({
    hasExceededThreshold: jest.fn().mockResolvedValue(false),
    calculateTTLToPT: jest.fn().mockReturnValue(3600)
  }));
});
jest.mock('../../src/services/social/post-analytics-snapshot-writer', () => ({
  upsertDailySnapshot: jest.fn().mockResolvedValue({})
}));
jest.mock('../../src/queues/social.queue', () => ({
  socialQueue: { add: jest.fn().mockResolvedValue({ id: 'requeued-job' }) }
}));
jest.mock('../../src/services/social/youtube/youtube-analytics.service', () => ({
  getVideoAnalytics: jest.fn()
}));

const DistributedLockService = require('../../src/services/social/distributed-lock.service');
const QuotaTrackerService = require('../../src/services/social/quota-tracker.service');
const { upsertDailySnapshot } = require('../../src/services/social/post-analytics-snapshot-writer');
const { socialQueue } = require('../../src/queues/social.queue');
const youtubeAnalyticsService = require('../../src/services/social/youtube/youtube-analytics.service');
const { REDIS_KEY_BUILDERS } = require('../../src/constants/analytics-snapshot.constants');
const { QUEUE_CONFIG } = require('../../src/constants/video-publish.constants');
const socialWorker = require('../../src/queues/social.worker');

const PLATFORM_POST_ID = 'yt_video_1';
const BRAND_ID = 'brand_1';

describe('social.worker.js — handleBackfillPostAnalytics', () => {
  const lockInstance = DistributedLockService.mock.results[0].value;
  const quotaInstance = QuotaTrackerService.mock.results[0].value;

  beforeEach(() => {
    jest.clearAllMocks();
    lockInstance.acquireLock.mockResolvedValue('backfill-token');
    lockInstance.releaseLock.mockResolvedValue(1);
    quotaInstance.hasExceededThreshold.mockResolvedValue(false);
    quotaInstance.calculateTTLToPT.mockReturnValue(3600);
  });

  const buildJob = (overrides = {}) => ({
    data: {
      postId: null,
      platformPostId: PLATFORM_POST_ID,
      brandId: BRAND_ID,
      publishedAt: null,
      ...overrides
    }
  });

  it('skips the API call and re-enqueues with a PT-midnight delay when over quota budget', async () => {
    quotaInstance.hasExceededThreshold.mockResolvedValue(true);

    await socialWorker.handleBackfillPostAnalytics(buildJob());

    expect(youtubeAnalyticsService.getVideoAnalytics).not.toHaveBeenCalled();
    expect(lockInstance.acquireLock).not.toHaveBeenCalled();
    expect(socialQueue.add).toHaveBeenCalledWith(
      QUEUE_CONFIG.SOCIAL.JOB_BACKFILL_POST_ANALYTICS,
      expect.objectContaining({ platformPostId: PLATFORM_POST_ID }),
      { delay: 3600 * 1000 }
    );
  });

  it('skips (dedup) when the backfill lock is already held by another job', async () => {
    lockInstance.acquireLock.mockResolvedValue(null);

    await socialWorker.handleBackfillPostAnalytics(buildJob());

    expect(youtubeAnalyticsService.getVideoAnalytics).not.toHaveBeenCalled();
    expect(upsertDailySnapshot).not.toHaveBeenCalled();
  });

  it('acquires the lock, persists rows via upsertDailySnapshot, and releases the lock', async () => {
    youtubeAnalyticsService.getVideoAnalytics.mockResolvedValue([
      { date: '2026-06-01', views: 10, likes: 2 },
      { date: '2026-06-02', views: 20, likes: 3 }
    ]);

    await socialWorker.handleBackfillPostAnalytics(buildJob());

    expect(lockInstance.acquireLock).toHaveBeenCalledWith(
      REDIS_KEY_BUILDERS.backfillLock(PLATFORM_POST_ID), expect.any(Number)
    );
    expect(upsertDailySnapshot).toHaveBeenCalledTimes(2);
    expect(upsertDailySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ platformPostId: PLATFORM_POST_ID, date: '2026-06-01', isEstimated: false })
    );
    expect(lockInstance.releaseLock).toHaveBeenCalledWith(
      REDIS_KEY_BUILDERS.backfillLock(PLATFORM_POST_ID), 'backfill-token'
    );
  });

  it('skips isFallback rows so a quota-blocked API failure is never persisted as isEstimated=false', async () => {
    youtubeAnalyticsService.getVideoAnalytics.mockResolvedValue([
      { date: '2026-06-01', views: 0, likes: 0, isFallback: true },
      { date: '2026-06-02', views: 15, likes: 1 }
    ]);

    await socialWorker.handleBackfillPostAnalytics(buildJob());

    expect(upsertDailySnapshot).toHaveBeenCalledTimes(1);
    expect(upsertDailySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2026-06-02' })
    );
  });

  it('always releases the lock even when the analytics fetch throws', async () => {
    youtubeAnalyticsService.getVideoAnalytics.mockRejectedValue(new Error('API down'));

    await expect(socialWorker.handleBackfillPostAnalytics(buildJob())).rejects.toThrow('API down');

    expect(lockInstance.releaseLock).toHaveBeenCalledWith(
      REDIS_KEY_BUILDERS.backfillLock(PLATFORM_POST_ID), 'backfill-token'
    );
  });
});
