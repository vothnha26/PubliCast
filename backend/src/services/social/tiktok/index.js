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

  async getPublishedVideos(brandId, pageToken = null, limit = 10, socialAccountId = null) {
    return tiktokVideo.getPublishedVideos(brandId, pageToken, limit, socialAccountId);
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
  async addCompetitor() { return null; }
}

module.exports = new TikTokService();
