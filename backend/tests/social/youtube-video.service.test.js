const youtubeVideoService = require('../../src/services/social/youtube/youtube-video.service');
const youtubeGateway = require('../../src/services/social/youtube/youtube.gateway');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const prisma = require('../../src/config/prisma');
const { findLatestPostMetrics } = require('../../src/services/social/post-metric-daily-persistence.util');

jest.mock('../../src/services/social/youtube/youtube.gateway');
jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/config/prisma', () => ({
  youTubePlaylistCache: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn()
  },
  youTubeVideoCategory: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn()
  },
  trackedVideo: {
    findUnique: jest.fn(),
    upsert: jest.fn()
  },
  postMetricDaily: {
    findFirst: jest.fn()
  },
  post: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  postTarget: {
    upsert: jest.fn()
  },
  brand: {
    findUnique: jest.fn()
  },
  $transaction: jest.fn(ops => Promise.all(ops))
}));
jest.mock('../../src/services/social/post-metric-daily-persistence.util', () => ({
  upsertPostMetricsDaily: jest.fn(),
  findLatestPostMetrics: jest.fn()
}));
jest.mock('../../src/services/social/google-oauth.service', () => ({
  createClient: jest.fn().mockReturnValue({
    setCredentials: jest.fn()
  })
}));
// getPublishedVideos clamps its start date via getHistoryWindowMonths (see
// plan-history-window.util.js), which reads the brand's subscription plan
// from Prisma — mock the util directly rather than the Prisma chain it
// depends on internally.
jest.mock('../../src/services/social/plan-history-window.util', () => ({
  getHistoryWindowMonths: jest.fn().mockResolvedValue(1)
}));

describe('YouTubeVideoService Playlists Pagination Unit Tests', () => {
  const mockBrandId = 'brand-123';
  const mockAccount = {
    id: 'acc-123',
    accessToken: 'token-123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([mockAccount]);
    prisma.$transaction.mockImplementation(ops => Promise.all(ops));
    // Empty by default so getPublishedVideos falls through to the live-API
    // path unless a test explicitly wants to exercise the DB-cache branch.
    prisma.post.findMany.mockResolvedValue([]);
    prisma.brand.findUnique.mockResolvedValue({ ownerId: 'user-owner-1' });
  });

  it('should return cached playlists from DB directly if forceRefresh is false and cache exists', async () => {
    prisma.youTubePlaylistCache.findMany.mockResolvedValue([
      { playlistId: 'p1', title: 'Cached Playlist', description: 'Desc', itemCount: 5 }
    ]);

    const result = await youtubeVideoService.getPlaylists(mockBrandId, false);

    expect(result).toEqual([{ id: 'p1', title: 'Cached Playlist', description: 'Desc', itemCount: 5 }]);
    // Cache is keyed by the resolved account, not just brandId, so a brand
    // with multiple YouTube channels doesn't serve one channel's cached
    // playlists from another's cache entry.
    expect(prisma.youTubePlaylistCache.findMany).toHaveBeenCalledWith({ where: { brandId: mockBrandId, socialAccountId: mockAccount.id } });
    expect(youtubeGateway.getPlaylists).not.toHaveBeenCalled();
  });

  it('should fetch from gateway, support pagination and upsert DB cache if cache miss or forceRefresh is true', async () => {
    prisma.youTubePlaylistCache.findMany.mockResolvedValue([]);

    // Mock 2 pages of playlists
    youtubeGateway.getPlaylists
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 'p1',
              snippet: { title: 'Playlist 1', description: 'Desc 1' },
              contentDetails: { itemCount: 10 }
            }
          ],
          nextPageToken: 'page-token-2'
        }
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 'p2',
              snippet: { title: 'Playlist 2', description: 'Desc 2' },
              contentDetails: { itemCount: 20 }
            }
          ]
        }
      });

    const result = await youtubeVideoService.getPlaylists(mockBrandId, true);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 'p1', title: 'Playlist 1', description: 'Desc 1', itemCount: 10 });
    expect(result[1]).toEqual({ id: 'p2', title: 'Playlist 2', description: 'Desc 2', itemCount: 20 });

    expect(youtubeGateway.getPlaylists).toHaveBeenCalledTimes(2);
    expect(youtubeGateway.getPlaylists).toHaveBeenNthCalledWith(1, expect.any(Object), 50, null);
    expect(youtubeGateway.getPlaylists).toHaveBeenNthCalledWith(2, expect.any(Object), 50, 'page-token-2');

    expect(prisma.youTubePlaylistCache.deleteMany).toHaveBeenCalledWith({ where: { brandId: mockBrandId, socialAccountId: mockAccount.id } });
    expect(prisma.youTubePlaylistCache.createMany).toHaveBeenCalledWith({
      data: [
        { brandId: mockBrandId, socialAccountId: mockAccount.id, playlistId: 'p1', title: 'Playlist 1', description: 'Desc 1', itemCount: 10 },
        { brandId: mockBrandId, socialAccountId: mockAccount.id, playlistId: 'p2', title: 'Playlist 2', description: 'Desc 2', itemCount: 20 }
      ]
    });
  });

  describe('getVideoCategories', () => {
    it('should return cached categories from DB by regionCode if forceRefresh is false and cache exists', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([
        { ...mockAccount, youtubeChannel: { country: 'VN' } }
      ]);
      prisma.youTubeVideoCategory.findMany.mockResolvedValue([
        { categoryId: '22', title: 'People & Blogs' }
      ]);

      const result = await youtubeVideoService.getVideoCategories(mockBrandId, false);

      expect(result).toEqual([{ id: '22', title: 'People & Blogs' }]);
      expect(prisma.youTubeVideoCategory.findMany).toHaveBeenCalledWith({ where: { regionCode: 'VN' } });
      expect(youtubeGateway.getVideoCategories).not.toHaveBeenCalled();
    });

    it('should default regionCode to US when channel country is missing', async () => {
      prisma.youTubeVideoCategory.findMany.mockResolvedValue([]);
      youtubeGateway.getVideoCategories.mockResolvedValue({
        data: { items: [{ id: '20', snippet: { title: 'Gaming', assignable: true } }] }
      });

      await youtubeVideoService.getVideoCategories(mockBrandId, false);

      expect(youtubeGateway.getVideoCategories).toHaveBeenCalledWith(expect.any(Object), 'US');
    });

    it('should filter out non-assignable categories and upsert DB cache', async () => {
      prisma.youTubeVideoCategory.findMany.mockResolvedValue([]);
      youtubeGateway.getVideoCategories.mockResolvedValue({
        data: {
          items: [
            { id: '20', snippet: { title: 'Gaming', assignable: true } },
            { id: '29', snippet: { title: 'Nonprofits & Activism', assignable: false } }
          ]
        }
      });

      const result = await youtubeVideoService.getVideoCategories(mockBrandId, true);

      expect(result).toEqual([{ id: '20', title: 'Gaming' }]);
      expect(prisma.youTubeVideoCategory.deleteMany).toHaveBeenCalledWith({ where: { regionCode: 'US' } });
      expect(prisma.youTubeVideoCategory.createMany).toHaveBeenCalledWith({
        data: [{ regionCode: 'US', categoryId: '20', title: 'Gaming' }]
      });
    });
  });

  describe('updateVideo', () => {
    it('should delegate updateVideo to youtubeGateway after resolving auth context', async () => {
      youtubeGateway.updateVideo.mockResolvedValue({ data: { id: 'vid-123' } });

      const result = await youtubeVideoService.updateVideo(mockBrandId, 'vid-123', { title: 'New Title' });

      expect(youtubeGateway.updateVideo).toHaveBeenCalledWith(
        expect.any(Object),
        'vid-123',
        { title: 'New Title' }
      );
      expect(result).toEqual({ data: { id: 'vid-123' } });
    });
  });

  describe('getPublishedVideos channel scoping (cross-channel leak fix, Smart Fetch DB-only)', () => {
    it('scopes the DB query to the given socialAccountId', async () => {
      findLatestPostMetrics.mockResolvedValue([]);

      await youtubeVideoService.getPublishedVideos('brand-123', null, 10, 'acc-123');

      expect(findLatestPostMetrics).toHaveBeenCalledWith('brand-123', 'YOUTUBE', 'acc-123', 10, expect.any(String), null);
      expect(youtubeGateway.getPlaylistItems).not.toHaveBeenCalled();
    });

    it('does not scope the DB query by account when socialAccountId is omitted (brand-wide caller)', async () => {
      findLatestPostMetrics.mockResolvedValue([]);

      await youtubeVideoService.getPublishedVideos('brand-123', null, 10);

      expect(findLatestPostMetrics).toHaveBeenCalledWith('brand-123', 'YOUTUBE', null, 10, expect.any(String), null);
    });
  });

  describe('_getAuthContext (IDOR guard)', () => {
    it('rejects a socialAccountId that belongs to a different brand', async () => {
      socialAccountRepository.findById.mockResolvedValue({
        id: 'acc-other-brand',
        brandId: 'brand-OTHER',
        accessToken: 'token-x',
        refreshToken: 'refresh-x'
      });

      await expect(
        youtubeVideoService.updateVideo('brand-123', 'vid-1', { title: 'x' }, 'acc-other-brand')
      ).rejects.toThrow('YouTube account not connected');
    });
  });

  describe('madeForKids Status Mapping (Smart Fetch DB-only)', () => {
    it('should include madeForKids status in getPublishedVideos output', async () => {
      findLatestPostMetrics.mockResolvedValue([{
        platformPostId: 'v-1',
        captionSnippet: 'Kid Video',
        thumbnailUrl: 'http://thumb',
        publishedAt: new Date('2026-07-28'),
        views: 10,
        likes: 5,
        comments: 0,
        postUrl: null,
        metrics: { madeForKids: true }
      }]);

      const result = await youtubeVideoService.getPublishedVideos(mockBrandId);
      expect(result.videos[0].madeForKids).toBe(true);
    });

    it('should include madeForKids status in getVideoDetails output', async () => {
      prisma.postMetricDaily.findFirst.mockResolvedValue({
        platformPostId: 'v-2',
        captionSnippet: 'Adult Video',
        thumbnailUrl: 'http://thumb',
        publishedAt: null,
        views: 100,
        likes: 50,
        metrics: { channelId: 'c-1', channelTitle: 'Chan', madeForKids: false }
      });

      const details = await youtubeVideoService.getVideoDetails(mockBrandId, 'v-2');
      expect(details.madeForKids).toBe(false);
    });
  });

  describe('getPostInsights', () => {
    const { upsertPostMetricsDaily } = require('../../src/services/social/post-metric-daily-persistence.util');

    it('returns empty metrics when no account is connected', async () => {
      prisma.postMetricDaily.findFirst.mockResolvedValue(null);
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([]);

      const result = await youtubeVideoService.getPostInsights(mockBrandId, 'video123');

      expect(result).toEqual({
        views: 0,
        watchTime: 0,
        totalWatchHrs: 0,
        avgViewDuration: 0,
        likes: 0,
        comments: 0,
        shares: 0
      });
      expect(youtubeGateway.getAnalyticsReportQuery).not.toHaveBeenCalled();
    });

    it('returns the cached PostMetricDaily row when fresh (within 24h)', async () => {
      prisma.postMetricDaily.findFirst.mockResolvedValue({
        views: 500,
        likes: 50,
        comments: 5,
        fetchedAt: new Date(),
        metrics: { totalWatchHrs: 2, avgViewDuration: 120, shares: 3 }
      });

      const result = await youtubeVideoService.getPostInsights(mockBrandId, 'video123');

      expect(result).toEqual({
        views: 500,
        watchTime: 2,
        totalWatchHrs: 2,
        avgViewDuration: 120,
        likes: 50,
        comments: 5,
        shares: 3
      });
      expect(youtubeGateway.getAnalyticsReportQuery).not.toHaveBeenCalled();
    });

    it('fetches live metrics and persists into PostMetricDaily on cache miss (stale or absent)', async () => {
      prisma.postMetricDaily.findFirst.mockResolvedValue(null);
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([mockAccount]);
      upsertPostMetricsDaily.mockResolvedValue([]);
      youtubeGateway.getAnalyticsReportQuery.mockResolvedValue({
        data: { rows: [['1000', '100', '10', '5', '120.0', '120']] }
      });

      const result = await youtubeVideoService.getPostInsights(mockBrandId, 'video123');

      expect(result).toEqual({
        views: 1000,
        watchTime: 2,
        totalWatchHrs: 2,
        avgViewDuration: 120,
        likes: 100,
        comments: 10,
        shares: 5
      });
      expect(upsertPostMetricsDaily).toHaveBeenCalledWith(
        mockBrandId,
        mockAccount.id,
        'YOUTUBE',
        [expect.objectContaining({
          platformPostId: 'video123',
          likes: 100,
          comments: 10,
          views: 1000
        })]
      );
    });
  });
});
