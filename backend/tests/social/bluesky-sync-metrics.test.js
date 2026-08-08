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

  describe('getPublishedVideos', () => {
    it('delegates to bluesky-analytics.getPublishedPosts and walks pages until one has no nextPageToken', async () => {
      socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValueOnce(mockAccount);
      // No pageToken passed in -> getPublishedVideos walks every page itself
      // (bounded by MAX_PAGE_COUNT / the cutoff date) instead of handing a
      // single page's nextPageToken back to the caller.
      blueskyAnalytics.getPublishedPosts
        .mockResolvedValueOnce({
          data: [{ id: 'p1', message: 'hi', likes: 2 }],
          nextPageToken: 'cursor-2'
        })
        .mockResolvedValueOnce({
          data: [{ id: 'p2', message: 'yo', likes: 1 }],
          nextPageToken: null
        });

      const result = await blueskyService.getPublishedVideos(mockBrandId, null, 10, null);

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
      expect(result).toEqual({
        data: [{ id: 'p1', message: 'hi', likes: 2 }, { id: 'p2', message: 'yo', likes: 1 }],
        nextPageToken: null,
        prevPageToken: null
      });
    });

    it('passes an explicit pageToken straight through as a single page (client-driven pagination)', async () => {
      socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValueOnce(mockAccount);
      blueskyAnalytics.getPublishedPosts.mockResolvedValueOnce({
        data: [{ id: 'p1', message: 'hi', likes: 2 }],
        nextPageToken: 'cursor-2'
      });

      const result = await blueskyService.getPublishedVideos(mockBrandId, 'cursor-1', 10, null);

      expect(blueskyAnalytics.getPublishedPosts).toHaveBeenCalledTimes(1);
      expect(blueskyAnalytics.getPublishedPosts).toHaveBeenCalledWith(
        expect.anything(),
        'did:plc:testuser123',
        { limit: 10, cursor: 'cursor-1' }
      );
      expect(result).toEqual({
        data: [{ id: 'p1', message: 'hi', likes: 2 }],
        nextPageToken: 'cursor-2',
        prevPageToken: null
      });
    });

    it('returns an empty result when no Bluesky account is connected', async () => {
      socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValueOnce(null);

      const result = await blueskyService.getPublishedVideos(mockBrandId, null, 10, null);

      expect(result).toEqual({ data: [], nextPageToken: null, prevPageToken: null });
      expect(blueskyAnalytics.getPublishedPosts).not.toHaveBeenCalled();
    });
  });
});
