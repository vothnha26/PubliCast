const youtubeGateway = require('../../src/services/social/youtube/youtube.gateway');
const { google } = require('googleapis');
const { YOUTUBE_QUOTA_COSTS, YOUTUBE_API_PARTS } = require('../../src/services/social/youtube/youtube.constants');

// Mock googleapis
jest.mock('googleapis', () => {
  const mockYoutube = {
    channels: { list: jest.fn() },
    playlistItems: { list: jest.fn(), insert: jest.fn() },
    videos: { list: jest.fn(), insert: jest.fn(), delete: jest.fn() },
    search: { list: jest.fn() },
    commentThreads: { list: jest.fn(), insert: jest.fn() },
    comments: { insert: jest.fn(), update: jest.fn(), delete: jest.fn() },
    thumbnails: { set: jest.fn() },
    playlists: { list: jest.fn() },
    videoCategories: { list: jest.fn() }
  };
  const mockYoutubeAnalytics = {
    reports: { query: jest.fn() }
  };
  return {
    google: {
      youtube: jest.fn(() => mockYoutube),
      youtubeAnalytics: jest.fn(() => mockYoutubeAnalytics)
    }
  };
});

describe('YouTubeGateway Quota Tracking Unit Tests', () => {
  let mockYoutubeInstance;
  let mockQuotaService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockYoutubeInstance = google.youtube();
    
    // Gán mock quotaService trực tiếp vào instance để kiểm thử độc lập
    mockQuotaService = {
      incrementAndGet: jest.fn().mockResolvedValue(1)
    };
    youtubeGateway.quotaService = mockQuotaService;
  });

  describe('_trackQuota Error Handling', () => {
    it('should catch errors thrown by quotaService and not rethrow', async () => {
      const originalWarn = console.warn;
      console.warn = jest.fn();

      mockQuotaService.incrementAndGet.mockRejectedValueOnce(new Error('Redis Connection Failure'));
      mockYoutubeInstance.channels.list.mockResolvedValue({ data: { items: [] } });

      await expect(youtubeGateway.getChannelList('fake-auth')).resolves.toBeDefined();
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Quota tracking failed for youtube: Redis Connection Failure'));

      console.warn = originalWarn;
    });
  });

  describe('API calls trigger _trackQuota with correct parameters', () => {
    let spyTrackQuota;

    beforeEach(() => {
      spyTrackQuota = jest.spyOn(youtubeGateway, '_trackQuota');
    });

    afterEach(() => {
      spyTrackQuota.mockRestore();
    });

    it('should track quota on getChannelList', async () => {
      mockYoutubeInstance.channels.list.mockResolvedValue({ data: { items: [] } });
      await youtubeGateway.getChannelList('fake-auth');
      expect(spyTrackQuota).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.CHANNELS_LIST);
      expect(mockQuotaService.incrementAndGet).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.CHANNELS_LIST);
    });

    it('should track quota on getPlaylistItems', async () => {
      mockYoutubeInstance.playlistItems.list.mockResolvedValue({ data: {} });
      await youtubeGateway.getPlaylistItems('fake-auth', 'playlist-123');
      expect(spyTrackQuota).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.PLAYLIST_ITEMS_LIST);
      expect(mockQuotaService.incrementAndGet).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.PLAYLIST_ITEMS_LIST);
    });

    it('should track quota on getVideosList', async () => {
      mockYoutubeInstance.videos.list.mockResolvedValue({ data: {} });
      await youtubeGateway.getVideosList('fake-auth', ['v1', 'v2']);
      expect(spyTrackQuota).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.VIDEOS_LIST);
      expect(mockQuotaService.incrementAndGet).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.VIDEOS_LIST);
    });

    it('should request part including status field in getVideosList', async () => {
      mockYoutubeInstance.videos.list.mockResolvedValue({ data: {} });
      await youtubeGateway.getVideosList('fake-auth', ['v1']);
      expect(mockYoutubeInstance.videos.list).toHaveBeenCalledWith(
        expect.objectContaining({
          part: expect.stringContaining('status')
        })
      );
      expect(mockYoutubeInstance.videos.list).toHaveBeenCalledWith(
        expect.objectContaining({
          part: YOUTUBE_API_PARTS.VIDEOS_LIST
        })
      );
    });

    it('should track quota on searchChannels', async () => {
      mockYoutubeInstance.search.list.mockResolvedValue({ data: {} });
      await youtubeGateway.searchChannels('fake-auth', 'query');
      expect(spyTrackQuota).toHaveBeenCalledWith('youtube-search', YOUTUBE_QUOTA_COSTS.SEARCH_LIST);
      expect(mockQuotaService.incrementAndGet).toHaveBeenCalledWith('youtube-search', YOUTUBE_QUOTA_COSTS.SEARCH_LIST);
    });

    it('should track quota on getCommentThreads', async () => {
      mockYoutubeInstance.commentThreads.list.mockResolvedValue({ data: {} });
      await youtubeGateway.getCommentThreads('fake-auth', 'channel-123');
      expect(spyTrackQuota).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.COMMENT_THREADS_LIST);
      expect(mockQuotaService.incrementAndGet).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.COMMENT_THREADS_LIST);
    });

    it('should pass pageToken and maxResults to Google API in getCommentThreads', async () => {
      mockYoutubeInstance.commentThreads.list.mockResolvedValue({ data: {} });
      await youtubeGateway.getCommentThreads('fake-auth', 'channel-123', 50, 'page-abc');
      expect(mockYoutubeInstance.commentThreads.list).toHaveBeenCalledWith(
        expect.objectContaining({
          allThreadsRelatedToChannelId: 'channel-123',
          maxResults: 50,
          pageToken: 'page-abc'
        })
      );
    });

    it('should track quota on insertCommentReply', async () => {
      mockYoutubeInstance.comments.insert.mockResolvedValue({ data: {} });
      await youtubeGateway.insertCommentReply('fake-auth', 'parent-123', 'text');
      expect(spyTrackQuota).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.COMMENTS_INSERT);
      expect(mockQuotaService.incrementAndGet).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.COMMENTS_INSERT);
    });

    it('should track quota on updateComment', async () => {
      mockYoutubeInstance.comments.update.mockResolvedValue({ data: {} });
      await youtubeGateway.updateComment('fake-auth', 'comment-123', 'text');
      expect(spyTrackQuota).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.COMMENTS_UPDATE);
      expect(mockQuotaService.incrementAndGet).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.COMMENTS_UPDATE);
    });

    it('should track quota on deleteComment', async () => {
      mockYoutubeInstance.comments.delete.mockResolvedValue({ data: {} });
      await youtubeGateway.deleteComment('fake-auth', 'comment-123');
      expect(spyTrackQuota).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.COMMENTS_DELETE);
      expect(mockQuotaService.incrementAndGet).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.COMMENTS_DELETE);
    });

    it('should NOT track quota on getAnalyticsReportQuery', async () => {
      const mockAnalytics = google.youtubeAnalytics();
      mockAnalytics.reports.query.mockResolvedValue({ data: {} });
      await youtubeGateway.getAnalyticsReportQuery('fake-auth', {});
      expect(spyTrackQuota).not.toHaveBeenCalled();
      expect(mockQuotaService.incrementAndGet).not.toHaveBeenCalled();
    });

    it('should track quota on uploadVideo and set containsSyntheticMedia if provided', async () => {
      mockYoutubeInstance.videos.insert.mockResolvedValue({ data: {} });
      await youtubeGateway.uploadVideo('fake-auth', {}, { title: 'test', containsSyntheticMedia: true });
      expect(spyTrackQuota).toHaveBeenCalledWith('youtube-videos-insert', YOUTUBE_QUOTA_COSTS.VIDEOS_INSERT);
      expect(mockQuotaService.incrementAndGet).toHaveBeenCalledWith('youtube-videos-insert', YOUTUBE_QUOTA_COSTS.VIDEOS_INSERT);
      expect(mockYoutubeInstance.videos.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            status: expect.objectContaining({
              containsSyntheticMedia: true
            })
          })
        })
      );
    });

    it('should track quota on getPlaylists', async () => {
      mockYoutubeInstance.playlists.list.mockResolvedValue({ data: {} });
      await youtubeGateway.getPlaylists('fake-auth');
      expect(spyTrackQuota).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.PLAYLISTS_LIST);
      expect(mockQuotaService.incrementAndGet).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.PLAYLISTS_LIST);
    });

    it('should pass pageToken and limit to Google API in getPlaylists', async () => {
      mockYoutubeInstance.playlists.list.mockResolvedValue({ data: {} });
      await youtubeGateway.getPlaylists('fake-auth', 20, 'playlist-page-123');
      expect(mockYoutubeInstance.playlists.list).toHaveBeenCalledWith(
        expect.objectContaining({
          mine: true,
          maxResults: 20,
          pageToken: 'playlist-page-123'
        })
      );
    });

    it('should track quota on addVideoToPlaylist', async () => {
      mockYoutubeInstance.playlistItems.insert.mockResolvedValue({ data: {} });
      await youtubeGateway.addVideoToPlaylist('fake-auth', 'playlist-123', 'video-123');
      expect(spyTrackQuota).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.PLAYLIST_ITEMS_INSERT);
      expect(mockQuotaService.incrementAndGet).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.PLAYLIST_ITEMS_INSERT);
    });

    it('should track quota on insertCommentThread', async () => {
      mockYoutubeInstance.commentThreads.insert.mockResolvedValue({ data: {} });
      await youtubeGateway.insertCommentThread('fake-auth', 'video-123', 'text');
      expect(spyTrackQuota).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.COMMENT_THREADS_INSERT);
      expect(mockQuotaService.incrementAndGet).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.COMMENT_THREADS_INSERT);
    });

    it('should track quota on setCustomThumbnail', async () => {
      mockYoutubeInstance.thumbnails.set.mockResolvedValue({ data: {} });
      await youtubeGateway.setCustomThumbnail('fake-auth', 'video-123', {}, 'image/jpeg');
      expect(spyTrackQuota).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.THUMBNAILS_SET);
      expect(mockQuotaService.incrementAndGet).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.THUMBNAILS_SET);
    });

    it('should track quota on deleteVideo', async () => {
      mockYoutubeInstance.videos.delete.mockResolvedValue({ data: {} });
      await youtubeGateway.deleteVideo('fake-auth', 'video-123');
      expect(spyTrackQuota).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.VIDEOS_DELETE);
      expect(mockQuotaService.incrementAndGet).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.VIDEOS_DELETE);
    });

    it('should track quota and pass regionCode on getVideoCategories', async () => {
      mockYoutubeInstance.videoCategories.list.mockResolvedValue({ data: { items: [] } });
      await youtubeGateway.getVideoCategories('fake-auth', 'VN');
      expect(mockYoutubeInstance.videoCategories.list).toHaveBeenCalledWith({
        part: YOUTUBE_API_PARTS.VIDEO_CATEGORIES_LIST,
        regionCode: 'VN'
      });
      expect(spyTrackQuota).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.VIDEO_CATEGORIES_LIST);
      expect(mockQuotaService.incrementAndGet).toHaveBeenCalledWith('youtube', YOUTUBE_QUOTA_COSTS.VIDEO_CATEGORIES_LIST);
    });
  });
});
