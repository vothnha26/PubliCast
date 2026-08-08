const youtubeVideoService = require('../../src/services/social/youtube/youtube-video.service');
const youtubeGateway = require('../../src/services/social/youtube/youtube.gateway');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const prisma = require('../../src/config/prisma');

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
  $transaction: jest.fn(ops => Promise.all(ops))
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

  describe('madeForKids Status Mapping', () => {
    it('should include madeForKids status in getPublishedVideos output', async () => {
      youtubeGateway.getChannelList.mockResolvedValue({
        data: { items: [{ contentDetails: { relatedPlaylists: { uploads: 'uploads-id-123' } } }] }
      });
      youtubeGateway.getPlaylistItems.mockResolvedValue({
        data: { items: [{ contentDetails: { videoId: 'v-1' } }] }
      });
      youtubeGateway.getVideosList.mockResolvedValue({
        data: {
          items: [{
            id: 'v-1',
            snippet: { title: 'Kid Video', thumbnails: { default: { url: 'http://thumb' } }, publishedAt: '2026-07-28' },
            statistics: { viewCount: '10', likeCount: '5', commentCount: '0' },
            contentDetails: { duration: 'PT1M' },
            status: { madeForKids: true }
          }]
        }
      });

      const result = await youtubeVideoService.getPublishedVideos(mockBrandId);
      expect(result.videos[0].madeForKids).toBe(true);
    });

    it('should include madeForKids status in getVideoDetails output', async () => {
      youtubeGateway.getVideosList.mockResolvedValue({
        data: {
          items: [{
            id: 'v-2',
            snippet: { title: 'Adult Video', description: 'Desc', thumbnails: { default: { url: 'http://thumb' } }, channelId: 'c-1', channelTitle: 'Chan' },
            statistics: { viewCount: '100', likeCount: '50' },
            status: { selfDeclaredMadeForKids: false }
          }]
        }
      });
      youtubeGateway.getChannelList.mockResolvedValue({
        data: { items: [{ statistics: { subscriberCount: '1000' } }] }
      });

      const details = await youtubeVideoService.getVideoDetails(mockBrandId, 'v-2');
      expect(details.madeForKids).toBe(false);
    });
  });
});
