const { google } = require('googleapis');
const { YOUTUBE_CATEGORIES, API_VERSIONS, YOUTUBE_PRIVACY } = require('../../../utils/constants');
const { YOUTUBE_MODERATION_STATUS, YOUTUBE_SEARCH_TYPES, YOUTUBE_QUOTA_COSTS } = require('./youtube.constants');
const QuotaTrackerService = require('../quota-tracker.service');

let redisClient = null;
try {
  redisClient = require('../../../config/redis');
} catch (_) {
  // Redis không có - quota tracking sẽ được bỏ qua
}

class YouTubeGateway {
  constructor() {
    this.quotaService = redisClient ? new QuotaTrackerService(redisClient) : null;
  }

  /**
   * Theo dõi lượng quota tiêu thụ của YouTube API
   */
  async _trackQuota(serviceName, cost) {
    if (!this.quotaService) return;
    try {
      await this.quotaService.incrementAndGet(serviceName, cost);
    } catch (err) {
      // Quota tracking lỗi không được phép làm ngắt luồng gọi API chính
      console.warn(`[YouTubeGateway] Quota tracking failed for ${serviceName}: ${err.message}`);
    }
  }

  /**
   * Lấy thông tin kênh từ Google API
   */
  async getChannelList(auth, mine = true, id = null) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    const params = {
      part: 'snippet,statistics,contentDetails'
    };
    if (mine) {
      params.mine = true;
    } else {
      if (id && id.startsWith('@')) {
        params.forHandle = id;
      } else {
        params.id = id;
      }
    }
    const response = await youtube.channels.list(params);
    await this._trackQuota('youtube', YOUTUBE_QUOTA_COSTS.CHANNELS_LIST);
    return response;
  }

  /**
   * Lấy danh sách video từ Playlist (ví dụ: Playlist Uploads)
   */
  async getPlaylistItems(auth, playlistId, limit, pageToken) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    const response = await youtube.playlistItems.list({
      part: 'snippet,contentDetails',
      playlistId,
      maxResults: parseInt(limit) || 10,
      pageToken
    });
    await this._trackQuota('youtube', YOUTUBE_QUOTA_COSTS.PLAYLISTS_LIST);
    return response;
  }

  /**
   * Lấy chi tiết thông tin các video
   */
  async getVideosList(auth, videoIds) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    const response = await youtube.videos.list({
      part: 'statistics,contentDetails,snippet',
      id: videoIds
    });
    await this._trackQuota('youtube', YOUTUBE_QUOTA_COSTS.VIDEOS_LIST);
    return response;
  }

  /**
   * Tìm kiếm kênh YouTube
   */
  async searchChannels(auth, query, maxResults = 5) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    const response = await youtube.search.list({
      part: 'snippet',
      q: query,
      type: YOUTUBE_SEARCH_TYPES.CHANNEL,
      maxResults
    });
    await this._trackQuota('youtube-search', YOUTUBE_QUOTA_COSTS.SEARCH_LIST);
    return response;
  }

  /**
   * Tìm kiếm nội dung (video/channel/playlist)
   */
  async getSearchList(auth, options = {}) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    const { q, type, maxResults = 50, publishedAfter, publishedBefore, forMine } = options;
    
    const params = {
      part: 'snippet',
      maxResults,
      type
    };

    if (q) params.q = q;
    if (publishedAfter) params.publishedAfter = publishedAfter;
    if (publishedBefore) params.publishedBefore = publishedBefore;
    if (forMine) params.forMine = true;

    const response = await youtube.search.list(params);
    await this._trackQuota('youtube-search', YOUTUBE_QUOTA_COSTS.SEARCH_LIST);
    return response;
  }

  /**
   * Lấy danh sách Comments từ Channel
   */
  async getCommentThreads(auth, channelId, maxResults = 100) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    const response = await youtube.commentThreads.list({
      part: 'snippet,replies',
      allThreadsRelatedToChannelId: channelId,
      maxResults,
      order: 'time',
      moderationStatus: YOUTUBE_MODERATION_STATUS.PUBLISHED
    });
    await this._trackQuota('youtube', YOUTUBE_QUOTA_COSTS.COMMENT_THREADS_LIST);
    return response;
  }

  /**
   * Thêm bình luận phản hồi (Reply)
   */
  async insertCommentReply(auth, parentId, text) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    const response = await youtube.comments.insert({
      part: 'snippet',
      requestBody: {
        snippet: {
          parentId,
          textOriginal: text
        }
      }
    });
    await this._trackQuota('youtube', YOUTUBE_QUOTA_COSTS.COMMENTS_INSERT);
    return response;
  }

  async updateComment(auth, commentId, text) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    const response = await youtube.comments.update({
      part: 'snippet',
      requestBody: {
        id: commentId,
        snippet: {
          textOriginal: text
        }
      }
    });
    await this._trackQuota('youtube', YOUTUBE_QUOTA_COSTS.COMMENTS_UPDATE);
    return response;
  }

  async deleteComment(auth, commentId) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    const response = await youtube.comments.delete({
      id: commentId
    });
    await this._trackQuota('youtube', YOUTUBE_QUOTA_COSTS.COMMENTS_DELETE);
    return response;
  }

  /**
   * Truy vấn báo cáo số liệu phân tích từ YouTube Analytics
   * Note: Quota Analytics có pool riêng biệt không tính vào YouTube Data API v3
   */
  async getAnalyticsReportQuery(auth, params) {
    const analytics = google.youtubeAnalytics({ version: API_VERSIONS.YOUTUBE_ANALYTICS, auth });
    return analytics.reports.query(params);
  }

  /**
   * Upload video lên YouTube
   */
  async uploadVideo(auth, videoStream, metadata) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    const { 
      title, 
      description, 
      privacyStatus = YOUTUBE_PRIVACY.PRIVATE, 
      categoryId = YOUTUBE_CATEGORIES.PEOPLE_BLOGS,
      selfDeclaredMadeForKids = false,
      tags = [],
      publishAt = null
    } = metadata;

    const requestBody = {
      snippet: {
        title,
        description,
        categoryId,
        tags
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids
      }
    };

    if (publishAt) {
      requestBody.status.publishAt = publishAt;
    }

    const response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody,
      media: {
        body: videoStream
      }
    });
    await this._trackQuota('youtube-videos-insert', YOUTUBE_QUOTA_COSTS.VIDEOS_INSERT);
    return response;
  }

  /**
   * Lấy danh sách Playlist của kênh
   */
  async getPlaylists(auth, limit = 50) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    const response = await youtube.playlists.list({
      part: 'snippet,contentDetails',
      mine: true,
      maxResults: limit
    });
    await this._trackQuota('youtube', YOUTUBE_QUOTA_COSTS.PLAYLISTS_LIST);
    return response;
  }

  /**
   * Thêm video vào Playlist
   */
  async addVideoToPlaylist(auth, playlistId, videoId) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    const response = await youtube.playlistItems.insert({
      part: 'snippet',
      requestBody: {
        snippet: {
          playlistId, resourceId: { kind: 'youtube#video', videoId }
        }
      }
    });
    await this._trackQuota('youtube', YOUTUBE_QUOTA_COSTS.PLAYLIST_ITEMS_INSERT);
    return response;
  }

  /**
   * Đăng bình luận mới lên video (Top-level comment)
   */
  async insertCommentThread(auth, videoId, text) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    const response = await youtube.commentThreads.insert({
      part: 'snippet',
      requestBody: {
        snippet: {
          videoId,
          topLevelComment: {
            snippet: {
              textOriginal: text
            }
          }
        }
      }
    });
    await this._trackQuota('youtube', YOUTUBE_QUOTA_COSTS.COMMENT_THREADS_INSERT);
    return response;
  }

  /**
   * Thiết lập ảnh bìa tùy chỉnh cho video YouTube
   */
  async setCustomThumbnail(auth, videoId, imageStream, mimeType) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    const response = await youtube.thumbnails.set({
      videoId,
      media: {
        mimeType: mimeType || 'image/jpeg',
        body: imageStream
      }
    });
    await this._trackQuota('youtube', YOUTUBE_QUOTA_COSTS.THUMBNAILS_SET);
    return response;
  }

  /**
   * Xóa video trên YouTube
   */
  async deleteVideo(auth, videoId) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    const response = await youtube.videos.delete({
      id: videoId
    });
    await this._trackQuota('youtube', YOUTUBE_QUOTA_COSTS.VIDEOS_DELETE);
    return response;
  }
}

module.exports = new YouTubeGateway();
