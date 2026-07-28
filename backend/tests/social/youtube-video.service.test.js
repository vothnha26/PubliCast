const youtubeVideoService = require('../../src/services/social/youtube/youtube-video.service');
const youtubeGateway = require('../../src/services/social/youtube/youtube.gateway');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const youtubePlaylistCache = require('../../src/services/social/youtube/youtube-playlist-cache');

jest.mock('../../src/services/social/youtube/youtube.gateway');
jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/services/social/youtube/youtube-playlist-cache');
jest.mock('../../src/services/social/google-oauth.service', () => ({
  createClient: jest.fn().mockReturnValue({
    setCredentials: jest.fn()
  })
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
  });

  it('should return cached playlists directly if forceRefresh is false and cache exists', async () => {
    const cachedData = [{ id: 'p1', title: 'Cached Playlist', description: 'Desc', itemCount: 5 }];
    youtubePlaylistCache.get.mockReturnValue(cachedData);

    const result = await youtubeVideoService.getPlaylists(mockBrandId, false);

    expect(result).toEqual(cachedData);
    expect(youtubePlaylistCache.get).toHaveBeenCalledWith(mockBrandId);
    expect(youtubeGateway.getPlaylists).not.toHaveBeenCalled();
  });

  it('should fetch from gateway, support pagination and update cache if cache miss or forceRefresh is true', async () => {
    youtubePlaylistCache.get.mockReturnValue(null);

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

    expect(youtubePlaylistCache.set).toHaveBeenCalledWith(mockBrandId, result);
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
