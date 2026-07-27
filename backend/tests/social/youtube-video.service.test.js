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
});
