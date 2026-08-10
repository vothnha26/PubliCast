const BaseSocialService = require('../base-social.service');
const youtubeAnalytics = require('./youtube-analytics.service');
const youtubeVideo = require('./youtube-video.service');
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

  async getPostInsights(brandId, videoId) {
    return youtubeVideo.getPostInsights(brandId, videoId);
  }

  // --- Videos & Tracking ---
  async getPublishedVideos(brandId, pageToken = null, limit = 10, socialAccountId = null, forceSync = false, startDate = null, endDate = null) {
    return youtubeVideo.getPublishedVideos(brandId, pageToken, limit, socialAccountId, forceSync, startDate, endDate);
  }

  // Smart Fetch Sync — the only method allowed to call YouTube's live Data
  // API for published videos. getPublishedVideos above is DB-only.
  async syncPublishedPosts(brandId, socialAccountId) {
    return youtubeVideo.syncPublishedVideos(brandId, socialAccountId);
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

  async getPlaylists(brandId, forceRefresh = false, socialAccountId = null) {
    return youtubeVideo.getPlaylists(brandId, forceRefresh, socialAccountId);
  }

  async getVideoCategories(brandId, forceRefresh = false, socialAccountId = null) {
    return youtubeVideo.getVideoCategories(brandId, forceRefresh, socialAccountId);
  }

  async updateVideo(brandId, videoId, updates, socialAccountId = null) {
    return youtubeVideo.updateVideo(brandId, videoId, updates, socialAccountId);
  }

  // --- Comments & Interactions ---

  // --- Publishing ---
  async publishPost(brandId, postData) {
    return youtubePublish.publishPost(brandId, postData);
  }

  async deletePost(brandId, platformPostId) {
    return youtubePublish.deletePost(brandId, platformPostId);
  }
  // --- Template Method Hook Implementations ---
  async buildPlatformClient(account) {
    return {
      channelId: account.youtubeAccount?.channelId || account.platformAccountId,
      accessToken: account.accessToken
    };
  }

  async fetchRawPlatformData(client, options = {}) {
    const { limit = 10, pageToken = null, socialAccountId = null, forceSync = false, startDate = null, endDate = null } = options;
    return await youtubeVideo.getPublishedVideos(options.brandId, pageToken, limit, socialAccountId, forceSync, startDate, endDate);
  }

  normalizePlatformData(rawData, options = {}) {
    return Array.isArray(rawData) ? rawData : (rawData?.videos || rawData?.data || []);
  }
}

module.exports = new YouTubeService();
