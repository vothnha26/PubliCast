const blueskyService = require('../../src/services/social/bluesky/bluesky.service');
const blueskyGateway = require('../../src/services/social/bluesky/bluesky.gateway');
const blueskyAnalytics = require('../../src/services/social/bluesky/bluesky-analytics.service');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const { PLATFORMS } = require('../../src/utils/constants');

jest.mock('../../src/services/social/bluesky/bluesky.gateway');
jest.mock('../../src/services/social/bluesky/bluesky-analytics.service');
jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/utils/encryption', () => ({
  decrypt: jest.fn((val) => val || 'decrypted_token'),
  encrypt: jest.fn((val) => val)
}));
jest.mock('../../src/services/social/post-metric-daily-persistence.util', () => ({
  upsertPostMetricsDaily: jest.fn(),
  findLatestPostMetrics: jest.fn()
}));

const { upsertPostMetricsDaily, findLatestPostMetrics } = require('../../src/services/social/post-metric-daily-persistence.util');

describe('BlueskyService — real metrics sync and published posts', () => {
  const mockAccountId = 'acc-bsky-456';
  const mockBrandId = 'brand-bsky-123';
  const mockAccount = {
    id: mockAccountId,
    brandId: mockBrandId,
    platform: PLATFORMS.BLUESKY,
    platformAccountId: 'did:plc:testuser123',
    username: 'test.bsky.social',
    accessToken: 'encrypted_access_token',
    refreshToken: 'encrypted_refresh_token',
    blueskyAccount: {
      did: 'did:plc:testuser123',
      handle: 'test.bsky.social',
      pdsUrl: 'https://bsky.social',
      emailConfirmed: true,
      followersCount: 50
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    blueskyGateway.createAgent.mockReturnValue({});
    blueskyGateway.resumeSession.mockResolvedValue(true);
    blueskyGateway.getProfile.mockResolvedValue({ followersCount: 120, followsCount: 30, postsCount: 15 });
  });

  describe('syncChannelMetrics', () => {
    it('persists real analytics from getAnalyticsReport into updateBlueskyMetrics', async () => {
      socialAccountRepository.findById
        .mockResolvedValueOnce(mockAccount) // initial lookup
        .mockResolvedValueOnce(mockAccount); // final re-fetch

      const fakeReport = { summary: { followers: 120 }, growth: [], interactions: { likes: 3 } };
      blueskyAnalytics.getAnalyticsReport.mockResolvedValueOnce(fakeReport);

      await blueskyService.syncChannelMetrics(mockAccountId, '2026-08-01', '2026-08-04');

      expect(blueskyAnalytics.getAnalyticsReport).toHaveBeenCalledWith(
        expect.anything(),
        'did:plc:testuser123',
        '2026-08-01',
        '2026-08-04',
        120
      );
      expect(socialAccountRepository.updateBlueskyMetrics).toHaveBeenCalledWith(mockAccountId, {
        followersCount: 120,
        followsCount: 30,
        postsCount: 15,
        analytics: { ...fakeReport, startDate: '2026-08-01', endDate: '2026-08-04', brandId: mockBrandId }
      });
    });

    it('still updates follower counts even when getAnalyticsReport fails', async () => {
      socialAccountRepository.findById
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(mockAccount);
      blueskyAnalytics.getAnalyticsReport.mockRejectedValueOnce(new Error('AT Protocol timeout'));

      await blueskyService.syncChannelMetrics(mockAccountId);

      expect(socialAccountRepository.updateBlueskyMetrics).toHaveBeenCalledWith(mockAccountId, {
        followersCount: 120,
        followsCount: 30,
        postsCount: 15,
        analytics: undefined
      });
    });
  });

  describe('getPublishedVideos (Smart Fetch: DB-only read)', () => {
    it('reads from PostMetricDaily and never calls the live AT Protocol API', async () => {
      socialAccountRepository.findByBrandAndPlatformLite.mockResolvedValueOnce([mockAccount]);
      findLatestPostMetrics.mockResolvedValueOnce([{
        platformPostId: 'at://did:plc:testuser123/app.bsky.feed.post/p1',
        captionSnippet: 'hi',
        publishedAt: new Date('2026-08-01'),
        likes: 2,
        comments: 0,
        shares: 0,
        reach: 0,
        views: 0,
        thumbnailUrl: null,
        metrics: {}
      }]);

      const result = await blueskyService.getPublishedVideos(mockBrandId, null, 10, null);

      expect(findLatestPostMetrics).toHaveBeenCalledWith(mockBrandId, PLATFORMS.BLUESKY, mockAccountId, 10);
      expect(result.data[0].likes).toBe(2);
      expect(result.nextPageToken).toBeNull();
      expect(blueskyAnalytics.getPublishedPosts).not.toHaveBeenCalled();
    });

    it('returns an empty result when no Bluesky account is connected', async () => {
      socialAccountRepository.findByBrandAndPlatformLite.mockResolvedValueOnce([]);

      const result = await blueskyService.getPublishedVideos(mockBrandId, null, 10, null);

      expect(result).toEqual({ data: [], nextPageToken: null, prevPageToken: null });
      expect(findLatestPostMetrics).not.toHaveBeenCalled();
      expect(blueskyAnalytics.getPublishedPosts).not.toHaveBeenCalled();
    });
  });

  describe('syncPublishedPosts (Smart Fetch: Sync-only live fetch)', () => {
    it('delegates to bluesky-analytics.getPublishedPosts, walks pages until one has no nextPageToken, and persists to PostMetricDaily', async () => {
      socialAccountRepository.findById.mockResolvedValueOnce(mockAccount);
      blueskyAnalytics.getPublishedPosts
        .mockResolvedValueOnce({
          data: [{ id: 'p1', uri: 'at://p1', message: 'hi', likes: 2, date: '2026-08-01' }],
          nextPageToken: 'cursor-2'
        })
        .mockResolvedValueOnce({
          data: [{ id: 'p2', uri: 'at://p2', message: 'yo', likes: 1, date: '2026-08-02' }],
          nextPageToken: null
        });
      upsertPostMetricsDaily.mockResolvedValueOnce([]);

      const result = await blueskyService.syncPublishedPosts(mockBrandId, mockAccountId);

      expect(blueskyAnalytics.getPublishedPosts).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        'did:plc:testuser123',
        { limit: 10, cursor: undefined }
      );
      expect(blueskyAnalytics.getPublishedPosts).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        'did:plc:testuser123',
        { limit: 10, cursor: 'cursor-2' }
      );
      expect(upsertPostMetricsDaily).toHaveBeenCalledWith(
        mockBrandId,
        mockAccountId,
        PLATFORMS.BLUESKY,
        expect.arrayContaining([
          expect.objectContaining({ platformPostId: 'at://p1' }),
          expect.objectContaining({ platformPostId: 'at://p2' })
        ])
      );
      expect(result).toEqual({ synced: 2 });
    });

    it('no-ops when no Bluesky account is connected', async () => {
      socialAccountRepository.findById.mockResolvedValueOnce(null);

      const result = await blueskyService.syncPublishedPosts(mockBrandId, mockAccountId);

      expect(result).toEqual({ synced: 0 });
      expect(blueskyAnalytics.getPublishedPosts).not.toHaveBeenCalled();
      expect(upsertPostMetricsDaily).not.toHaveBeenCalled();
    });
  });
});
