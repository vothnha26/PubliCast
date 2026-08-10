const tiktokVideoService = require('../../src/services/social/tiktok/tiktok-video.service');
const tiktokGateway = require('../../src/services/social/tiktok/tiktok.gateway');
const tiktokAnalytics = require('../../src/services/social/tiktok/tiktok-analytics.service');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const { upsertPostMetricsDaily, findLatestPostMetrics } = require('../../src/services/social/post-metric-daily-persistence.util');

jest.mock('../../src/services/social/tiktok/tiktok.gateway');
jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/services/social/tiktok/tiktok-analytics.service', () => ({
  getOrRefreshAccount: jest.fn(account => Promise.resolve(account))
}));
jest.mock('../../src/services/social/post-metric-daily-persistence.util', () => ({
  upsertPostMetricsDaily: jest.fn(),
  findLatestPostMetrics: jest.fn()
}));
jest.mock('../../src/services/social/plan-history-window.util', () => ({
  getHistoryWindowMonths: jest.fn().mockResolvedValue(6)
}));
jest.mock('../../src/services/social/quota-tracker.singleton', () => ({
  incrementAndGetMinute: jest.fn().mockResolvedValue(0)
}));

describe('TikTokVideoService', () => {
  const brandId = 'brand-1';
  const socialAccountId = 'acc-1';

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPublishedVideos (DB-only Smart Fetch read)', () => {
    it('reads from PostMetricDaily and never calls the live gateway', async () => {
      socialAccountRepository.findByIdLite.mockResolvedValue({ id: socialAccountId, brandId, platformAccountId: 'tt-1' });
      findLatestPostMetrics.mockResolvedValue([{
        platformPostId: 'v1',
        captionSnippet: 'Hello',
        thumbnailUrl: 'http://thumb',
        publishedAt: new Date('2026-01-01'),
        views: 100,
        likes: 10,
        comments: 2,
        shares: 1,
        postUrl: null,
        metrics: { duration: 15 }
      }]);

      const result = await tiktokVideoService.getPublishedVideos(brandId, 0, 10, socialAccountId);

      expect(result.videos).toHaveLength(1);
      expect(result.videos[0].id).toBe('v1');
      expect(result.videos[0].duration).toBe(15);
      expect(tiktokGateway.getVideoList).not.toHaveBeenCalled();
    });

    it('returns an empty list instead of throwing when no TikTok account is connected', async () => {
      socialAccountRepository.findByBrandAndPlatformLite.mockResolvedValue([]);

      const result = await tiktokVideoService.getPublishedVideos(brandId);

      expect(result).toEqual({ videos: [], nextPageToken: null, prevPageToken: null });
    });

    it('passes the requested date range through to findLatestPostMetrics (DB applies the filter, not this method)', async () => {
      socialAccountRepository.findByIdLite.mockResolvedValue({ id: socialAccountId, brandId, platformAccountId: 'tt-1' });
      // findLatestPostMetrics now applies the date filter itself (before its
      // own limit cut) — the DB would already exclude 'old' from its result,
      // so the mock only returns what a filtered query would.
      findLatestPostMetrics.mockResolvedValue([
        { platformPostId: 'new', publishedAt: new Date('2026-06-01'), views: 1, likes: 1, comments: 0, shares: 0, metrics: {} }
      ]);

      const result = await tiktokVideoService.getPublishedVideos(brandId, 0, 10, socialAccountId, '2026-01-01', '2026-12-31');

      expect(findLatestPostMetrics).toHaveBeenCalledWith(brandId, 'TIKTOK', socialAccountId, 10, '2026-01-01', '2026-12-31');
      expect(result.videos.map(v => v.id)).toEqual(['new']);
    });
  });

  describe('syncPublishedVideos (Sync-only live fetch + persistence)', () => {
    it('fetches the live TikTok feed and persists it via upsertPostMetricsDaily', async () => {
      socialAccountRepository.findById.mockResolvedValue({
        id: socialAccountId,
        brandId,
        accessToken: 'real-token',
        platformAccountId: 'tt-1'
      });
      tiktokGateway.getVideoList.mockResolvedValue({
        videos: [{
          id: 'v1',
          title: 'My video',
          cover_image_url: 'http://thumb',
          create_time: Math.floor(Date.now() / 1000),
          view_count: 100,
          like_count: 10,
          comment_count: 2,
          share_count: 1,
          duration: 15,
          share_url: 'http://share'
        }],
        cursor: 0,
        has_more: false
      });

      const result = await tiktokVideoService.syncPublishedVideos(brandId, socialAccountId);

      expect(result).toEqual({ synced: 1 });
      expect(upsertPostMetricsDaily).toHaveBeenCalledTimes(1);
      const [, , platform, rows] = upsertPostMetricsDaily.mock.calls[0];
      expect(platform).toBe('TIKTOK');
      expect(rows[0]).toMatchObject({ platformPostId: 'v1', views: 100, likes: 10, metrics: { duration: 15 } });
    });

    it('is a no-op for a mock-credentialed account (sandbox), and does not persist anything', async () => {
      socialAccountRepository.findById.mockResolvedValue({
        id: socialAccountId,
        brandId,
        accessToken: 'mock-token',
        platformAccountId: 'tt-1'
      });

      const result = await tiktokVideoService.syncPublishedVideos(brandId, socialAccountId);

      expect(result).toEqual({ synced: 0 });
      expect(tiktokGateway.getVideoList).not.toHaveBeenCalled();
      expect(upsertPostMetricsDaily).not.toHaveBeenCalled();
    });

    it('stops paging once a video older than the plan history window is seen', async () => {
      socialAccountRepository.findById.mockResolvedValue({
        id: socialAccountId,
        brandId,
        accessToken: 'real-token',
        platformAccountId: 'tt-1'
      });
      const now = Math.floor(Date.now() / 1000);
      const eightMonthsAgo = now - 8 * 30 * 24 * 3600; // outside the 6-month mocked window
      tiktokGateway.getVideoList.mockResolvedValue({
        videos: [
          { id: 'recent', create_time: now, view_count: 1, like_count: 0, comment_count: 0, share_count: 0 },
          { id: 'old', create_time: eightMonthsAgo, view_count: 1, like_count: 0, comment_count: 0, share_count: 0 }
        ],
        cursor: 0,
        has_more: true
      });

      const result = await tiktokVideoService.syncPublishedVideos(brandId, socialAccountId);

      expect(result).toEqual({ synced: 1 });
      expect(tiktokGateway.getVideoList).toHaveBeenCalledTimes(1); // stopped, did not walk to page 2
    });
  });

  describe('_getAccount (IDOR guard)', () => {
    it('throws instead of syncing when the socialAccountId belongs to a different brand', async () => {
      socialAccountRepository.findById.mockResolvedValue({
        id: socialAccountId,
        brandId: 'brand-OTHER',
        accessToken: 'real-token'
      });

      await expect(
        tiktokVideoService.syncPublishedVideos(brandId, socialAccountId)
      ).rejects.toThrow('TikTok account not connected');
      expect(tiktokGateway.getVideoList).not.toHaveBeenCalled();
    });
  });
});
