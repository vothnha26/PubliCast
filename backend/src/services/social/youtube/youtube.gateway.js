const { google } = require('googleapis');
const { YOUTUBE_CATEGORIES, API_VERSIONS, YOUTUBE_PRIVACY, YOUTUBE_MODERATION_STATUS, YOUTUBE_SEARCH_TYPES } = require('../../../utils/constants');

class YouTubeGateway {
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
    return youtube.channels.list(params);
  }

  /**
   * Lấy danh sách video từ Playlist (ví dụ: Playlist Uploads)
   */
  async getPlaylistItems(auth, playlistId, limit, pageToken) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    return youtube.playlistItems.list({
      part: 'snippet,contentDetails',
      playlistId,
      maxResults: parseInt(limit) || 10,
      pageToken
    });
  }

  /**
   * Lấy chi tiết thông tin các video
   */
  async getVideosList(auth, videoIds) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    return youtube.videos.list({
      part: 'statistics,contentDetails,snippet',
      id: videoIds
    });
  }

  /**
   * Tìm kiếm kênh YouTube
   */
  async searchChannels(auth, query, maxResults = 5) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    return youtube.search.list({
      part: 'snippet',
      q: query,
      type: YOUTUBE_SEARCH_TYPES.CHANNEL,
      maxResults
    });
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

    return youtube.search.list(params);
  }

  /**
   * Lấy danh sách Comments từ Channel
   */
  async getCommentThreads(auth, channelId, maxResults = 100) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    return youtube.commentThreads.list({
      part: 'snippet,replies',
      allThreadsRelatedToChannelId: channelId,
      maxResults,
      order: 'time',
      moderationStatus: YOUTUBE_MODERATION_STATUS.PUBLISHED
    });
  }

  /**
   * Thêm bình luận phản hồi (Reply)
   */
  async insertCommentReply(auth, parentId, text) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    return youtube.comments.insert({
      part: 'snippet',
      requestBody: {
        snippet: {
          parentId,
          textOriginal: text
        }
      }
    });
  }

  async updateComment(auth, commentId, text) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    return youtube.comments.update({
      part: 'snippet',
      requestBody: {
        id: commentId,
        snippet: {
          textOriginal: text
        }
      }
    });
  }

  async deleteComment(auth, commentId) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    return youtube.comments.delete({
      id: commentId
    });
  }

  /**
   * Truy vấn báo cáo số liệu phân tích từ YouTube Analytics
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

    return youtube.videos.insert({
      part: 'snippet,status',
      requestBody,
      media: {
        body: videoStream
      }
    });
  }

  /**
   * Lấy danh sách Playlist của kênh
   */
  async getPlaylists(auth, limit = 50) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    return youtube.playlists.list({
      part: 'snippet,contentDetails',
      mine: true,
      maxResults: limit
    });
  }

  /**
   * Thêm video vào Playlist
   */
  async addVideoToPlaylist(auth, playlistId, videoId) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    return youtube.playlistItems.insert({
      part: 'snippet',
      requestBody: {
        snippet: {
          playlistId, resourceId: { kind: 'youtube#video', videoId }
        }
      }
    });
  }

  /**
   * Đăng bình luận mới lên video (Top-level comment)
   */
  async insertCommentThread(auth, videoId, text) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    return youtube.commentThreads.insert({
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
  }

  /**
   * Thiết lập ảnh bìa tùy chỉnh cho video YouTube
   */
  async setCustomThumbnail(auth, videoId, imageStream, mimeType) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    return youtube.thumbnails.set({
      videoId,
      media: {
        mimeType: mimeType || 'image/jpeg',
        body: imageStream
      }
    });
  }

  /**
   * Xóa video trên YouTube
   */
  async deleteVideo(auth, videoId) {
    const youtube = google.youtube({ version: API_VERSIONS.YOUTUBE, auth });
    return youtube.videos.delete({
      id: videoId
    });
  }
}

module.exports = new YouTubeGateway();
