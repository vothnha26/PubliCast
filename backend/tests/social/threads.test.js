/**
 * Regression tests for #97: Threads service previously masked real errors
 * and fabricated metrics as if they were measured data:
 * - getChannelInfo's catch fallback returned a fake account
 *   (followersCount:1500, followingCount:300, mediaCount:10) on ANY error.
 * - getAnalyticsReport estimated views as likes*12 from the feed when
 *   insights were unavailable, and derived viewsBreakdown from that
 *   already-fabricated number using a fixed 90/10 ratio.
 * - getPublishedVideos estimated views/reach as likes*12 / likes*8 per post.
 */
jest.mock('../../src/services/social/threads/threads.gateway');
jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/repositories/workspace/brand.repository', () => ({
  findBrandWithSubscription: jest.fn().mockResolvedValue(null)
}));
jest.mock('../../src/config/prisma', () => ({
  postMetricDaily: {
    findMany: jest.fn().mockResolvedValue([]),
    upsert: jest.fn().mockResolvedValue({})
  }
}));

const prisma = require('../../src/config/prisma');

const threadsGateway = require('../../src/services/social/threads/threads.gateway');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const threadsService = require('../../src/services/social/threads');
const { PLATFORMS } = require('../../src/utils/constants');

describe('ThreadsService (#97)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getChannelInfo', () => {
    it('does not fabricate followers/following/media counts when the real API call fails', async () => {
      threadsGateway.getAccountDetails.mockRejectedValue(new Error('Invalid OAuth access token'));

      const result = await threadsService.getChannelInfo({ accessToken: 'expired-token' });

      expect(result.followersCount).toBeNull();
      expect(result.followingCount).toBeNull();
      expect(result.mediaCount).toBeNull();
      expect(result.degraded).toBe(true);
      expect(result.error).toBe('Invalid OAuth access token');
    });

    it('returns real profile data on success', async () => {
      threadsGateway.getAccountDetails.mockResolvedValue({
        id: 'threads-1',
        username: 'real_user',
        name: 'Real User',
        threads_biography: 'bio'
      });

      const result = await threadsService.getChannelInfo({ accessToken: 'real-token' });

      expect(result.igAccountId).toBe('threads-1');
      expect(result.username).toBe('real_user');
      expect(result.degraded).toBeUndefined();
    });
  });

  describe('getAnalyticsReport', () => {
    it('does not estimate views from likes (no more reactions*12) and omits viewsBreakdown', async () => {
      threadsGateway.getInsights.mockRejectedValue(new Error('Missing threads_insights permission'));
      threadsGateway.getThreadsMediaFeed.mockResolvedValue({
        data: [{ id: 'p1', timestamp: new Date().toISOString(), like_count: 100, media_type: 'TEXT' }],
        nextPageToken: null,
        prevPageToken: null
      });

      const result = await threadsService.getAnalyticsReport(
        { accessToken: 'real-token', igAccountId: 'threads-1' },
        null,
        null
      );

      const parsed = JSON.parse(result.audienceDemographicsJson);
      const dayWithPost = parsed.growth.find(d => d.totalContent > 0);

      expect(dayWithPost).toBeDefined();
      expect(dayWithPost.views).toBe(0); // not 100 * 12
      expect(parsed.interactions.viewsBreakdown).toBeUndefined();
    });
  });

  describe('getPublishedVideos', () => {
    it('does not fabricate per-post views/reach/engagement from likes — reads DB-only, no gateway call', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([
        { id: 'sa_threads_1', platformAccountId: 'threads-1', accessToken: 'real-token' }
      ]);
      prisma.postMetricDaily.findMany.mockResolvedValue([{
        platformPostId: 'p1',
        captionSnippet: 'Hello',
        postType: 'TEXT',
        publishedAt: new Date(),
        likes: 50,
        comments: 0,
        shares: 0,
        reach: null,
        views: null,
        snapshotDate: new Date(),
        metrics: {}
      }]);

      const result = await threadsService.getPublishedVideos('brand-1');

      expect(result.data[0].views).toBeNull(); // not 50 * 12
      expect(result.data[0].reach).toBeNull(); // not 50 * 8
      expect(result.data[0].engagement).toBeNull();
      expect(result.data[0].reactions).toBe(50);
      expect(threadsGateway.getThreadsMediaFeed).not.toHaveBeenCalled();
    });
  });

  describe('syncPublishedPosts (IDOR guard)', () => {
    it('does not sync when the socialAccountId belongs to a different brand', async () => {
      socialAccountRepository.findById.mockResolvedValue({
        id: 'sa_threads_1',
        brandId: 'brand-OTHER',
        platformAccountId: 'threads-1',
        accessToken: 'real-token'
      });

      const result = await threadsService.syncPublishedPosts('brand-1', 'sa_threads_1');

      expect(result).toEqual({ synced: 0 });
      expect(threadsGateway.getThreadsMediaFeed).not.toHaveBeenCalled();
    });

    it('syncs when the socialAccountId belongs to the caller brand', async () => {
      socialAccountRepository.findById.mockResolvedValue({
        id: 'sa_threads_1',
        brandId: 'brand-1',
        platformAccountId: 'threads-1',
        accessToken: 'real-token'
      });
      threadsGateway.getThreadsMediaFeed.mockResolvedValue({ data: [], nextPageToken: null });

      const result = await threadsService.syncPublishedPosts('brand-1', 'sa_threads_1');

      expect(result).toEqual({ synced: 0 });
      expect(threadsGateway.getThreadsMediaFeed).toHaveBeenCalled();
    });
  });
});
