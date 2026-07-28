const youtubeService = require('../../src/services/social/youtube');
const googleOAuthService = require('../../src/services/social/google-oauth.service');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const youtubeAnalytics = require('../../src/services/social/youtube/youtube-analytics.service');
const youtubeGateway = require('../../src/services/social/youtube/youtube.gateway');
const { google } = require('googleapis');

jest.mock('googleapis');
jest.mock('../../src/services/social/google-oauth.service');
jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/services/social/connection-conflict.guard', () => ({
  ConnectionConflictGuard: {
    validateConflict: jest.fn().mockResolvedValue({ conflict: false })
  }
}));

describe('YouTubeService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getChannelInfo', () => {
    it('should fetch channel info correctly', async () => {
      const mockChannel = {
        id: 'UC123',
        snippet: {
          title: 'Test Channel',
          customUrl: '@test',
          thumbnails: { default: { url: 'http://pic.jpg' } },
          country: 'VN',
          defaultLanguage: 'vi'
        },
        statistics: {
          subscriberCount: '1000',
          videoCount: '50',
          viewCount: '5000'
        },
        contentDetails: {
          relatedPlaylists: {
            uploads: 'uploadsPlaylist123'
          }
        }
      };

      const mockList = jest.fn().mockResolvedValue({
        data: { items: [mockChannel] }
      });

      google.youtube.mockReturnValue({
        channels: { list: mockList }
      });

      const result = await youtubeService.getChannelInfo({});

      expect(result.channelId).toBe('UC123');
      expect(result.displayName).toBe('Test Channel');
      expect(result.statistics.subscriberCount).toBe('1000');
    });

    it('should throw error if no channel found', async () => {
      google.youtube.mockReturnValue({
        channels: {
          list: jest.fn().mockResolvedValue({ data: { items: [] } })
        }
      });

      await expect(youtubeService.getChannelInfo({})).rejects.toThrow('No YouTube channel found for this account');
    });

    it('propagates an auth failure instead of silently falling back to empty data (#70)', async () => {
      const authError = new Error('invalid_grant: Token has been expired or revoked.');
      authError.code = 'invalid_grant';
      google.youtube.mockReturnValue({
        channels: { list: jest.fn().mockRejectedValue(authError) }
      });

      await expect(youtubeService.getChannelInfo({})).rejects.toThrow('invalid_grant');
    });

    it('still falls back to empty data for a transient/network failure, not an auth failure (#70)', async () => {
      google.youtube.mockReturnValue({
        channels: { list: jest.fn().mockRejectedValue(new Error('socket hang up')) }
      });

      const result = await youtubeService.getChannelInfo({});

      expect(result.channelId).toBe('mock-youtube-channel-id');
    });
  });

  describe('connectChannel', () => {
    it('should exchange code and upsert account', async () => {
      const mockTokens = { access_token: 'abc', refresh_token: 'def' };
      const mockChannelData = { channelId: 'UC123', statistics: {}, snippet: {} };
      
      googleOAuthService.getTokens.mockResolvedValue(mockTokens);
      googleOAuthService.createClient.mockReturnValue({
        setCredentials: jest.fn()
      });
      
      const getChannelInfoSpy = jest.spyOn(youtubeAnalytics, 'getChannelInfo').mockResolvedValue(mockChannelData);
      socialAccountRepository.upsertYouTubeAccount.mockResolvedValue({ id: 'sa1' });

      const result = await youtubeService.connectChannel('brand1', 'code123');

      expect(googleOAuthService.getTokens).toHaveBeenCalledWith('code123', undefined);
      expect(socialAccountRepository.upsertYouTubeAccount).toHaveBeenCalledWith('brand1', mockChannelData, mockTokens);
      expect(result.id).toBe('sa1');
      
      getChannelInfoSpy.mockRestore();
    });
  });

  describe('publishPost', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        body: 'videoStreamMock'
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should upload video and return published info', async () => {
      const mockPostData = {
        title: 'Test Title',
        caption: 'Test Caption',
        mediaUrls: 'http://example.com/video.mp4',
        options: { privacyStatus: 'public' }
      };

      const mockAccount = {
        id: 'sa1',
        accessToken: 'token123',
        refreshToken: 'refresh123',
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000)
      };

      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([mockAccount]);
      googleOAuthService.createClient.mockReturnValue({
        setCredentials: jest.fn()
      });

      const mockGatewayResult = {
        data: {
          id: 'ytVideoId123',
          snippet: {
            publishedAt: '2026-05-24T12:00:00Z'
          }
        }
      };

      const uploadVideoSpy = jest.spyOn(youtubeGateway, 'uploadVideo').mockResolvedValue(mockGatewayResult);

      const result = await youtubeService.publishPost('brand1', mockPostData);

      expect(socialAccountRepository.findByBrandAndPlatform).toHaveBeenCalledWith('brand1', 'YOUTUBE');
      expect(uploadVideoSpy).toHaveBeenCalled();
      expect(result.platformVideoId).toBe('ytVideoId123');
      expect(result.videoUrl).toBe('https://www.youtube.com/watch?v=ytVideoId123');

      uploadVideoSpy.mockRestore();
    });

    it('should upload video with custom title, playlists, tags, and comment thread options', async () => {
      const mockPostData = {
        title: 'Original Title',
        caption: 'Original Caption',
        mediaUrls: 'http://example.com/video.mp4',
        options: {
          youtubeTitle: 'Custom YouTube Title',
          playlistId: 'playlistId123',
          tags: 'tag1, tag2',
          madeForKids: true,
          firstComment: 'Top level comment!',
          privacyStatus: 'private'
        }
      };

      const mockAccount = {
        id: 'sa1',
        accessToken: 'token123',
        refreshToken: 'refresh123',
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000)
      };

      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([mockAccount]);
      googleOAuthService.createClient.mockReturnValue({
        setCredentials: jest.fn()
      });

      const mockGatewayResult = {
        data: {
          id: 'ytVideoId123',
          snippet: {
            publishedAt: '2026-05-24T12:00:00Z'
          }
        }
      };

      const uploadVideoSpy = jest.spyOn(youtubeGateway, 'uploadVideo').mockResolvedValue(mockGatewayResult);
      const addVideoToPlaylistSpy = jest.spyOn(youtubeGateway, 'addVideoToPlaylist').mockResolvedValue({});
      const insertCommentThreadSpy = jest.spyOn(youtubeGateway, 'insertCommentThread').mockResolvedValue({});

      const result = await youtubeService.publishPost('brand1', mockPostData);

      expect(uploadVideoSpy).toHaveBeenCalledWith(expect.any(Object), 'videoStreamMock', {
        title: 'Custom YouTube Title',
        description: 'Original Caption',
        privacyStatus: 'private',
        categoryId: '22',
        selfDeclaredMadeForKids: true,
        tags: ['tag1', 'tag2'],
        publishAt: null
      });

      expect(addVideoToPlaylistSpy).toHaveBeenCalledWith(expect.any(Object), 'playlistId123', 'ytVideoId123');
      expect(insertCommentThreadSpy).toHaveBeenCalledWith(expect.any(Object), 'ytVideoId123', 'Top level comment!');
      
      expect(result.platformVideoId).toBe('ytVideoId123');

      uploadVideoSpy.mockRestore();
      addVideoToPlaylistSpy.mockRestore();
      insertCommentThreadSpy.mockRestore();
    });

    it('should upload video and set custom thumbnail if options.youtubeThumbnail is provided', async () => {
      const mockPostData = {
        title: 'Original Title',
        caption: 'Original Caption',
        mediaUrls: 'http://example.com/video.mp4',
        options: {
          youtubeThumbnail: 'http://example.com/thumb.jpg'
        }
      };

      const mockAccount = {
        id: 'sa1',
        accessToken: 'token123',
        refreshToken: 'refresh123',
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000)
      };

      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([mockAccount]);
      googleOAuthService.createClient.mockReturnValue({
        setCredentials: jest.fn()
      });

      const mockGatewayResult = {
        data: {
          id: 'ytVideoId123',
          snippet: {
            publishedAt: '2026-05-24T12:00:00Z'
          }
        }
      };

      const uploadVideoSpy = jest.spyOn(youtubeGateway, 'uploadVideo').mockResolvedValue(mockGatewayResult);
      const setCustomThumbnailSpy = jest.spyOn(youtubeGateway, 'setCustomThumbnail').mockResolvedValue({});

      global.fetch = jest.fn().mockImplementation((url) => {
        if (url === 'http://example.com/video.mp4') {
          return Promise.resolve({
            ok: true,
            body: 'videoStreamMock'
          });
        }
        if (url === 'http://example.com/thumb.jpg') {
          return Promise.resolve({
            ok: true,
            body: 'imageStreamMock'
          });
        }
        return Promise.reject(new Error('not found'));
      });

      const result = await youtubeService.publishPost('brand1', mockPostData);

      expect(uploadVideoSpy).toHaveBeenCalled();
      expect(setCustomThumbnailSpy).toHaveBeenCalledWith(expect.any(Object), 'ytVideoId123', 'imageStreamMock', 'image/jpeg');
      expect(result.platformVideoId).toBe('ytVideoId123');

      uploadVideoSpy.mockRestore();
      setCustomThumbnailSpy.mockRestore();
    });

    it('should automatically append #Shorts to title when publishing a YouTube Short', async () => {
      const mockPostData = {
        title: 'Original Title',
        caption: 'Original Caption',
        mediaUrls: 'http://example.com/video.mp4',
        options: {
          youtubeType: 'short',
          youtubeTitle: 'My Short Video',
          privacyStatus: 'private'
        }
      };

      const mockAccount = {
        id: 'sa1',
        accessToken: 'token123',
        refreshToken: 'refresh123',
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000)
      };

      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([mockAccount]);
      googleOAuthService.createClient.mockReturnValue({
        setCredentials: jest.fn()
      });

      const mockGatewayResult = {
        data: {
          id: 'ytVideoId123',
          snippet: {
            publishedAt: '2026-05-24T12:00:00Z'
          }
        }
      };

      const uploadVideoSpy = jest.spyOn(youtubeGateway, 'uploadVideo').mockResolvedValue(mockGatewayResult);

      const result = await youtubeService.publishPost('brand1', mockPostData);

      expect(uploadVideoSpy).toHaveBeenCalledWith(expect.any(Object), 'videoStreamMock', {
        title: 'My Short Video #Shorts',
        description: 'Original Caption',
        privacyStatus: 'private',
        categoryId: '22',
        selfDeclaredMadeForKids: false,
        tags: [],
        publishAt: null
      });

      expect(result.platformVideoId).toBe('ytVideoId123');

      uploadVideoSpy.mockRestore();
    });

    it('should configure publishAt and force private status when scheduledAt is provided', async () => {
      const futureScheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const mockPostData = {
        title: 'Scheduled Title',
        caption: 'Scheduled Caption',
        mediaUrls: 'http://example.com/video.mp4',
        scheduledAt: futureScheduledAt,
        options: {
          privacyStatus: 'public'
        }
      };

      const mockAccount = {
        id: 'sa1',
        accessToken: 'token123',
        refreshToken: 'refresh123',
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000)
      };

      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([mockAccount]);
      googleOAuthService.createClient.mockReturnValue({
        setCredentials: jest.fn()
      });

      const mockGatewayResult = {
        data: {
          id: 'ytVideoId123',
          snippet: {
            publishedAt: '2026-05-24T12:00:00Z'
          }
        }
      };

      const uploadVideoSpy = jest.spyOn(youtubeGateway, 'uploadVideo').mockResolvedValue(mockGatewayResult);

      const result = await youtubeService.publishPost('brand1', mockPostData);

      expect(uploadVideoSpy).toHaveBeenCalledWith(expect.any(Object), 'videoStreamMock', {
        title: 'Scheduled Title',
        description: 'Scheduled Caption',
        privacyStatus: 'private',
        categoryId: '22',
        selfDeclaredMadeForKids: false,
        tags: [],
        publishAt: futureScheduledAt
      });

      expect(result.platformVideoId).toBe('ytVideoId123');

      uploadVideoSpy.mockRestore();
    });

    it('should short-circuit and return success immediately if platformPostId is provided', async () => {
      const mockPostData = {
        title: 'Already Uploaded Title',
        caption: 'Already Uploaded Caption',
        mediaUrls: 'http://example.com/video.mp4',
        platformPostId: 'ytVideoId555',
        options: {}
      };

      const result = await youtubeService.publishPost('brand1', mockPostData);

      expect(result.platformVideoId).toBe('ytVideoId555');
      expect(result.status).toBe('PUBLISHED');
    });
  });

  // getPlaylists coverage (DB-backed cache) lives in youtube-video.service.test.js
});
