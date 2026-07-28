const BaseSocialService = require('../base-social.service');
const youtubeAnalytics = require('./youtube-analytics.service');
const youtubeVideo = require('./youtube-video.service');
const youtubePublish = require('./youtube-publish.service');

const youtubePubSub = require('./youtube-pubsub.service');
const youtubePubSubProcessor = require('./youtube-pubsub.processor');

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

  async getVideoCategories(brandId, forceRefresh = false) {
    return youtubeVideo.getVideoCategories(brandId, forceRefresh);
  }

  async updateVideo(brandId, videoId, updates, socialAccountId = null) {
    return youtubeVideo.updateVideo(brandId, videoId, updates, socialAccountId);
  }

  // --- PubSubHubbub Push Notifications ---
  async requestPubSubSubscription(channelId, callbackUrl, mode) {
    return youtubePubSub.requestHubSubscription(channelId, callbackUrl, mode);
  }

  async verifyPubSubIntent(query) {
    return youtubePubSub.verifyIntent(query);
  }

  async processPubSubEvent(xmlPayload, signatureHeader) {
    return youtubePubSubProcessor.processEventPayload(xmlPayload, signatureHeader);
  }

  // --- Comments & Interactions ---

  // --- Publishing ---
  async publishPost(brandId, postData) {
    return youtubePublish.publishPost(brandId, postData);
  }

  async deletePost(brandId, platformPostId) {
    return youtubePublish.deletePost(brandId, platformPostId);
  }
}

module.exports = new YouTubeService();
