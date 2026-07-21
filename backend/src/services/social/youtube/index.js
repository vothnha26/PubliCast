const BaseSocialService = require('../base-social.service');
const youtubeAnalytics = require('./youtube-analytics.service');
const youtubeVideo = require('./youtube-video.service');
const youtubeComment = require('./youtube-comment.service');
const youtubePublish = require('./youtube-publish.service');

class YouTubeService extends BaseSocialService {
  // --- Analytics & Channel ---
  async getChannelInfo(auth, startDate, endDate) {
    return youtubeAnalytics.getChannelInfo(auth, startDate, endDate);
  }

  async getAnalyticsReport(auth, startDate, endDate) {
    return youtubeAnalytics.getAnalyticsReport(auth, startDate, endDate);
  }

  async connectChannel(brandId, code, redirectUri) {
    return youtubeAnalytics.connectChannel(brandId, code, redirectUri);
  }

  async syncChannelMetrics(socialAccountId, startDate, endDate) {
    return youtubeAnalytics.syncChannelMetrics(socialAccountId, startDate, endDate);
  }

  async addCompetitor(brandId, channelId) {
    return youtubeAnalytics.addCompetitor(brandId, channelId);
  }

  async getCompetitors(brandId) {
    return youtubeAnalytics.getCompetitors(brandId);
  }

  async deleteCompetitor(id, brandId, userId) {
    return youtubeAnalytics.deleteCompetitor(id, brandId, userId);
  }

  async getVideoAnalytics(brandId, videoId, startDate, endDate) {
    return youtubeAnalytics.getVideoAnalytics(brandId, videoId, startDate, endDate);
  }

  async getVideoInsights(brandId, videoId) {
    return youtubeAnalytics.getVideoInsights(brandId, videoId);
  }

  // --- Videos & Tracking ---
  async getPublishedVideos(brandId, pageToken = null, limit = 10, socialAccountId = null) {
    return youtubeVideo.getPublishedVideos(brandId, pageToken, limit, socialAccountId);
  }

  async trackVideo(brandId, videoUrl) {
    return youtubeVideo.trackVideo(brandId, videoUrl);
  }

  async getTrackedVideos(brandId) {
    return youtubeVideo.getTrackedVideos(brandId);
  }

  async getVideoDetails(brandId, videoId) {
    return youtubeVideo.getVideoDetails(brandId, videoId);
  }

  async searchChannel(brandId, query) {
    return youtubeVideo.searchChannel(brandId, query);
  }

  async getPlaylists(brandId, forceRefresh = false) {
    return youtubeVideo.getPlaylists(brandId, forceRefresh);
  }

  // --- Comments & Interactions ---
  async fetchChannelComments(brandId) {
    return youtubeComment.fetchChannelComments(brandId);
  }

  async replyToComment(brandId, parentCommentId, text) {
    return youtubeComment.replyToComment(brandId, parentCommentId, text);
  }

  // --- Publishing ---
  async publishPost(brandId, postData) {
    return youtubePublish.publishPost(brandId, postData);
  }

  async deletePost(brandId, platformPostId) {
    return youtubePublish.deletePost(brandId, platformPostId);
  }
}

module.exports = new YouTubeService();
