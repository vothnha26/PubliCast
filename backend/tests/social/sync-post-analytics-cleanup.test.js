/**
 * Orphan Snapshot Cleanup Tests — sync-post-analytics.service.js
 *
 * 1. cleanupOrphanSnapshotsForBrandPlatform: deletes all snapshot rows for a
 *    brand+platform pair (called on disconnectAccount)
 * 2. cleanupStaleUnlinkedSnapshots: weekly sweep — deletes postId=null rows
 *    whose brand+platform no longer has an active SocialAccount, but leaves
 *    rows for brand+platform pairs that are still connected
 */

jest.mock('../../src/config/redis', () => ({ get: jest.fn(), setEx: jest.fn(), ping: jest.fn() }));
jest.mock('../../src/services/social/distributed-lock.service', () => {
  return jest.fn().mockImplementation(() => ({ acquireLock: jest.fn(), releaseLock: jest.fn() }));
});
jest.mock('../../src/services/social/quota-tracker.service', () => {
  return jest.fn().mockImplementation(() => ({ hasExceededThreshold: jest.fn(), getCurrentUsage: jest.fn() }));
});
jest.mock('../../src/services/social/redis-health.service', () => {
  return jest.fn().mockImplementation(() => ({ shouldFailOpen: jest.fn().mockResolvedValue(false) }));
});
jest.mock('../../src/services/social/post-metric-sync.service', () => ({
  syncPostMetrics: jest.fn()
}));
jest.mock('../../src/config/prisma', () => ({
  post: { findMany: jest.fn() },
  postAnalyticsDailySnapshot: {
    deleteMany: jest.fn(),
    findMany: jest.fn()
  },
  socialAccount: { findMany: jest.fn() }
}));

const prismaMock = require('../../src/config/prisma');
const syncPostAnalyticsService = require('../../src/services/social/sync-post-analytics.service');

describe('SyncPostAnalyticsService — orphan snapshot cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cleanupOrphanSnapshotsForBrandPlatform', () => {
    it('deletes all snapshot rows for the given brand + platform', async () => {
      prismaMock.postAnalyticsDailySnapshot.deleteMany.mockResolvedValue({ count: 7 });

      const count = await syncPostAnalyticsService.cleanupOrphanSnapshotsForBrandPlatform('brand_1', 'FACEBOOK');

      expect(prismaMock.postAnalyticsDailySnapshot.deleteMany).toHaveBeenCalledWith({
        where: { brandId: 'brand_1', platform: 'FACEBOOK' }
      });
      expect(count).toBe(7);
    });
  });

  describe('cleanupStaleUnlinkedSnapshots', () => {
    it('returns 0 and does nothing when there are no orphan (postId=null) rows', async () => {
      prismaMock.postAnalyticsDailySnapshot.findMany.mockResolvedValue([]);

      const count = await syncPostAnalyticsService.cleanupStaleUnlinkedSnapshots();

      expect(count).toBe(0);
      expect(prismaMock.socialAccount.findMany).not.toHaveBeenCalled();
      expect(prismaMock.postAnalyticsDailySnapshot.deleteMany).not.toHaveBeenCalled();
    });

    it('deletes only rows whose brand+platform no longer has an active SocialAccount', async () => {
      prismaMock.postAnalyticsDailySnapshot.findMany.mockResolvedValue([
        { id: 'row-1', brandId: 'brand_1', platform: 'FACEBOOK' }, // brand_1/FACEBOOK still connected
        { id: 'row-2', brandId: 'brand_2', platform: 'YOUTUBE' }   // brand_2/YOUTUBE disconnected -> stale
      ]);
      prismaMock.socialAccount.findMany.mockResolvedValue([
        { brandId: 'brand_1', platform: 'FACEBOOK' }
      ]);
      prismaMock.postAnalyticsDailySnapshot.deleteMany.mockResolvedValue({ count: 1 });

      const count = await syncPostAnalyticsService.cleanupStaleUnlinkedSnapshots();

      expect(prismaMock.postAnalyticsDailySnapshot.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['row-2'] } }
      });
      expect(count).toBe(1);
    });

    it('returns 0 without calling deleteMany when every orphan row still has an active account', async () => {
      prismaMock.postAnalyticsDailySnapshot.findMany.mockResolvedValue([
        { id: 'row-1', brandId: 'brand_1', platform: 'FACEBOOK' }
      ]);
      prismaMock.socialAccount.findMany.mockResolvedValue([
        { brandId: 'brand_1', platform: 'FACEBOOK' }
      ]);

      const count = await syncPostAnalyticsService.cleanupStaleUnlinkedSnapshots();

      expect(count).toBe(0);
      expect(prismaMock.postAnalyticsDailySnapshot.deleteMany).not.toHaveBeenCalled();
    });
  });
});
