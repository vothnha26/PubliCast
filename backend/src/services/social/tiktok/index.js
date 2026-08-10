const BaseSocialService = require('../base-social.service');
const tiktokAnalytics = require('./tiktok-analytics.service');
const tiktokPost = require('./tiktok-post.service');
const tiktokVideo = require('./tiktok-video.service');
const tiktokComment = require('./tiktok-comment.service');

class TikTokService extends BaseSocialService {
  /**
   * Connect TikTok Channel (OAuth callback logic)
   */
  async connectChannel(brandId, code, redirectUri, codeVerifier) {
    return tiktokAnalytics.connectChannel(brandId, code, redirectUri, codeVerifier);
  }

  /**
   * Publish Post to TikTok
   */
  async publishPost(brandId, postData) {
    return tiktokPost.publishPost(brandId, postData);
  }

  async getChannelInfo(auth, startDate, endDate) {
    return tiktokAnalytics.getChannelInfo(auth, startDate, endDate);
  }

  async getPublishedVideos(brandId, pageToken = null, limit = 10, socialAccountId = null, startDate = null, endDate = null) {
    return tiktokVideo.getPublishedVideos(brandId, pageToken, limit, socialAccountId, startDate, endDate);
  }

  // Smart Fetch Sync — the only method allowed to call TikTok's live API
  // for published videos. getPublishedVideos above is DB-only.
  async syncPublishedPosts(brandId, socialAccountId) {
    return tiktokVideo.syncPublishedVideos(brandId, socialAccountId);
  }

  async getVideoComments(brandId, params = {}) {
    return tiktokComment.getVideoComments(brandId, params);
  }

  async getAnalyticsReport(auth, startDate, endDate, currentFollowers) {
    return tiktokAnalytics.getAnalyticsReport(auth, startDate, endDate, currentFollowers);
  }

  async syncChannelMetrics(socialAccountId, startDate, endDate) {
    return tiktokAnalytics.syncChannelMetrics(socialAccountId, startDate, endDate);
  }

  // --- Unsupported or Stub methods for LSP Compliance ---
  async fetchChannelComments() { return []; }
  async replyToComment() { return null; }
  async trackVideo() { return null; }
  async getVideoDetails() { return null; }
  async searchChannel() { return []; }
  // --- Template Method Hook Implementations ---
  async buildPlatformClient(account) {
    return {
      openId: account.tiktokAccount?.openId || account.platformAccountId,
      accessToken: account.accessToken
    };
  }

  async fetchRawPlatformData(client, options = {}) {
    const { limit = 10, pageToken = null, socialAccountId = null, startDate = null, endDate = null } = options;
    return await tiktokVideo.getPublishedVideos(options.brandId, pageToken, limit, socialAccountId, startDate, endDate);
  }

  normalizePlatformData(rawData, options = {}) {
    return Array.isArray(rawData) ? rawData : (rawData?.videos || rawData?.data || []);
  }
}

module.exports = new TikTokService();
