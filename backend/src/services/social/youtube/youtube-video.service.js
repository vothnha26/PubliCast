const youtubeGateway = require('./youtube.gateway');
const googleOAuthService = require('../google-oauth.service');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const trackedVideoRepository = require('../../../repositories/social/tracked-video.repository');
const MockConnectionGuard = require('../mock-connection.guard');
const { PLATFORMS, POST_STATUS, SEPARATORS } = require('../../../utils/constants');

class YouTubeVideoService {
  async getPublishedVideos(brandId, pageToken = null, limit = 10, socialAccountId = null) {
    try {
      const { auth, account } = await this._getAuthContext(brandId, false, socialAccountId);
      
      if (account && MockConnectionGuard.isMock(account.accessToken, account.platformAccountId)) {
        return {
          videos: [
            {
              id: 'mock-yt-vid-1',
              title: 'Hướng dẫn lên lịch đăng bài tự động đa kênh với PubliCast 🚀',
              thumbnailUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&auto=format&fit=crop&q=60',
              publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              views: '12500',
              likes: '840',
              comments: '124',
              duration: 'PT15M30S',
              status: POST_STATUS.PUBLISHED
            },
            {
              id: 'mock-yt-vid-2',
              title: 'Cẩm nang tối ưu hóa SEO Video YouTube năm 2026',
              thumbnailUrl: 'https://images.unsplash.com/photo-1598550476439-6847785fce6e?w=300&auto=format&fit=crop&q=60',
              publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              views: '8400',
              likes: '512',
              comments: '68',
              duration: 'PT10M15S',
              status: POST_STATUS.PUBLISHED
            }
          ],
          nextPageToken: null,
          prevPageToken: null
        };
      }
      const uploadsId = await this._resolveUploadsPlaylistId(auth, account);
      
      const playlistRes = await youtubeGateway.getPlaylistItems(auth, uploadsId, limit, pageToken);
      if (!playlistRes.data.items || playlistRes.data.items.length === 0) {
        return { videos: [], nextPageToken: null, prevPageToken: null };
      }

      const videoIds = playlistRes.data.items.map(item => item.contentDetails.videoId).join(SEPARATORS.COMMA);
      const videoDetails = await youtubeGateway.getVideosList(auth, videoIds);

      return {
        videos: this._formatVideoList(videoDetails.data.items),
        nextPageToken: playlistRes.data.nextPageToken,
        prevPageToken: playlistRes.data.prevPageToken
      };
    } catch (error) {
      if (error.message.includes('YouTube account not connected')) {
        return { videos: [], nextPageToken: null, prevPageToken: null };
      }
      throw error;
    }
  }
  async trackVideo(brandId, videoUrl) {
    const videoId = this.extractVideoId(videoUrl);
    if (!videoId) throw new Error('Invalid YouTube URL');

    const { auth } = await this._getAuthContext(brandId);
    if (auth?.credentials?.access_token && MockConnectionGuard.isMock(auth.credentials.access_token)) {
      return trackedVideoRepository.upsertTrackedVideo(brandId, videoId, {
        title: 'Video kiểm thử hiệu năng hệ thống (Mock)',
        thumbnailUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&auto=format&fit=crop&q=60',
        lastViews: 15200,
        lastLikes: 1120,
        lastComments: 94,
        channelId: 'mock-channel-id',
        channelName: 'Trong Phuc YouTube Channel',
        publishedAt: new Date()
      });
    }
    const response = await youtubeGateway.getVideosList(auth, videoId);

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('Video not found');
    }

    const video = response.data.items[0];
    return trackedVideoRepository.upsertTrackedVideo(brandId, videoId, this._prepareTrackedVideoData(video));
  }

  async getTrackedVideos(brandId) {
    return trackedVideoRepository.getTrackedVideos(brandId);
  }

  async getVideoDetails(brandId, videoId) {
    const { auth } = await this._getAuthContext(brandId, true);
    if (!auth) return null;

    if (auth.credentials?.access_token && MockConnectionGuard.isMock(auth.credentials.access_token)) {
      return {
        id: videoId,
        title: 'Video kiểm thử hiệu năng hệ thống (Mock)',
        description: 'Mô tả chi tiết video kiểm thử YouTube trong môi trường phát triển.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&auto=format&fit=crop&q=60',
        channelId: 'mock-channel-id',
        channelTitle: 'Trong Phuc YouTube Channel',
        subscriberCount: 15400,
        viewCount: 15200,
        likeCount: 1120,
        publishedAt: new Date().toISOString()
      };
    }

    const response = await youtubeGateway.getVideosList(auth, videoId);
    if (!response.data.items || response.data.items.length === 0) return null;

    const video = response.data.items[0];
    const channelRes = await youtubeGateway.getChannelList(auth, false, video.snippet.channelId);

    return this._formatVideoDetails(video, channelRes.data.items?.[0]);
  }

  async searchChannel(brandId, query) {
    const { auth } = await this._getAuthContext(brandId);
    if (auth?.credentials?.access_token && MockConnectionGuard.isMock(auth.credentials.access_token)) {
      return [
        {
          channelId: 'mock-chan-1',
          title: 'Trong Phuc Vlogs',
          description: 'Kênh chia sẻ cuộc sống và kinh nghiệm làm sản phẩm.',
          thumbnail: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=150&auto=format&fit=crop&q=60'
        }
      ];
    }
    const response = await youtubeGateway.searchChannels(auth, query);

    return (response.data.items || []).map(item => ({
      channelId: item.id?.channelId || item.snippet?.channelId || item.id,
      title: item.snippet?.title || "YouTube Channel",
      description: item.snippet?.description || "",
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || ""
    }));
  }

  async getPlaylists(brandId, forceRefresh = false) {
    const youtubePlaylistCache = require('./youtube-playlist-cache');
    if (!forceRefresh) {
      const cached = youtubePlaylistCache.get(brandId);
      if (cached) return cached;
    }

    const { auth } = await this._getAuthContext(brandId);
    if (auth?.credentials?.access_token && MockConnectionGuard.isMock(auth.credentials.access_token)) {
      const playlists = [
        {
          id: 'mock-playlist-1',
          title: 'Danh sách hướng dẫn React & Node.js',
          description: 'Các video tự học lập trình fullstack từ cơ bản.',
          itemCount: 12
        }
      ];
      youtubePlaylistCache.set(brandId, playlists);
      return playlists;
    }
    const res = await youtubeGateway.getPlaylists(auth);
    if (!res.data.items) return [];

    const playlists = res.data.items.map(item => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      itemCount: item.contentDetails.itemCount
    }));

    youtubePlaylistCache.set(brandId, playlists);
    return playlists;
  }

  // ============= Private Helper Methods =============

  async _getAuthContext(brandId, optional = false, socialAccountId = null) {
    let account;
    if (socialAccountId) {
      account = await socialAccountRepository.findById(socialAccountId);
    } else {
      const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.YOUTUBE);
      if (!socialAccount || socialAccount.length === 0) {
        if (optional) return { auth: null, account: null };
        throw new Error('YouTube account not connected');
      }
      account = socialAccount.find(acc => 
        !MockConnectionGuard.isMock(acc.accessToken, acc.platformAccountId)
      ) || socialAccount[0];
    }

    if (!account) {
      if (optional) return { auth: null, account: null };
      throw new Error('YouTube account not connected');
    }

    if (MockConnectionGuard.isMock(account.accessToken, account.platformAccountId)) {
      const auth = { credentials: { access_token: account.accessToken } };
      return { auth, account };
    }

    const auth = googleOAuthService.createClient();
    auth.setCredentials({ access_token: account.accessToken });
    return { auth, account };
  }

  async _resolveUploadsPlaylistId(auth, account) {
    let uploadsId = account.youtubeChannel?.uploadsPlaylistId;
    if (!uploadsId || uploadsId === 'mock-uploads-playlist-id') {
      const channelRes = await youtubeGateway.getChannelList(auth, true);
      uploadsId = channelRes.data.items[0]?.contentDetails?.relatedPlaylists?.uploads;
    }
    return uploadsId;
  }

  _formatVideoList(items) {
    return items.map(v => ({
      id: v.id,
      title: v.snippet.title,
      thumbnailUrl: v.snippet.thumbnails.medium?.url || v.snippet.thumbnails.default.url,
      publishedAt: v.snippet.publishedAt,
      views: v.statistics.viewCount,
      likes: v.statistics.likeCount,
      comments: v.statistics.commentCount,
      duration: v.contentDetails.duration,
      status: POST_STATUS.PUBLISHED
    }));
  }

  _formatVideoDetails(video, channel) {
    return {
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
      channelId: video.snippet.channelId,
      channelTitle: video.snippet.channelTitle,
      subscriberCount: channel?.statistics?.subscriberCount,
      viewCount: video.statistics.viewCount,
      likeCount: video.statistics.likeCount,
      publishedAt: video.snippet.publishedAt
    };
  }

  _prepareTrackedVideoData(video) {
    return {
      title: video.snippet.title,
      thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
      lastViews: parseInt(video.statistics.viewCount) || 0,
      lastLikes: parseInt(video.statistics.likeCount) || 0,
      lastComments: parseInt(video.statistics.commentCount) || 0,
      channelId: video.snippet.channelId,
      channelName: video.snippet.channelTitle,
      publishedAt: new Date(video.snippet.publishedAt)
    };
  }

  extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
}

module.exports = new YouTubeVideoService();
