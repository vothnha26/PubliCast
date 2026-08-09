const BaseSocialService = require('../base-social.service');
const facebookAnalytics = require('./facebook-analytics.service');
const facebookPost = require('./facebook-post.service');
const facebookComment = require('./facebook-comment.service');
const facebookCompetitor = require('./facebook-competitor.service');

class FacebookService extends BaseSocialService {
  // --- Analytics & Page ---
  async getChannelInfo(auth, startDate, endDate) {
    return facebookAnalytics.getChannelInfo(auth, startDate, endDate);
  }

  async getAnalyticsReport(auth, startDate, endDate) {
    // In Facebook, auth can be the pageId and access token inside auth object
    return facebookAnalytics.getAnalyticsReport(auth.pageId, auth.pageAccessToken, startDate, endDate, auth.followersCount || 0);
  }

  async connectChannel(brandId, code, redirectUri) {
    return facebookAnalytics.connectChannel(brandId, code, redirectUri);
  }

  async syncChannelMetrics(socialAccountId, startDate, endDate) {
    return facebookAnalytics.syncChannelMetrics(socialAccountId, startDate, endDate);
  }

  // --- Template Method Hook Implementations ---
  async buildPlatformClient(account) {
    return {
      pageId: account.facebookAccount?.facebookPageId || account.platformAccountId,
      accessToken: account.accessToken
    };
  }

  async fetchRawPlatformData(client, options = {}) {
    const { limit = 10, pageToken = null, socialAccountId = null, startDate = null, endDate = null } = options;
    return await facebookPost.getPublishedPosts(options.brandId, pageToken, limit, socialAccountId, startDate, endDate);
  }

  normalizePlatformData(rawData, options = {}) {
    return Array.isArray(rawData) ? rawData : (rawData?.posts || rawData?.videos || []);
  }

  // --- Posts & Feed ---
  async getPublishedVideos(brandId, pageToken = null, limit = 10, socialAccountId = null, startDate = null, endDate = null) {
    // For Facebook, getPublishedVideos behaves as getPublishedPosts
    return facebookPost.getPublishedPosts(brandId, pageToken, limit, socialAccountId, startDate, endDate);
  }

  // Smart Fetch Sync — the only method allowed to call Facebook's live Graph
  // API for published posts, called by posts-sync-scheduler.service.js's
  // cron webhook, OAuth-connect-time backfill, and the manual-refresh
  // endpoint. getPublishedVideos/getPublishedPosts above are DB-only reads.
  async syncPublishedPosts(brandId, socialAccountId) {
    return facebookPost.syncPublishedPosts(brandId, socialAccountId);
  }

  async publishPost(brandId, postData) {
    return facebookPost.publishPost(brandId, postData);
  }

  async updatePublishedPost(brandId, platformPostId, postData) {
    return facebookPost.updatePost(brandId, platformPostId, postData);
  }

  async deletePost(brandId, platformPostId) {
    return facebookPost.deletePost(brandId, platformPostId);
  }

  async getPostDetails(brandId, platformPostId, socialAccountId = null) {
    return facebookPost.getPostDetails(brandId, platformPostId, socialAccountId);
  }

  async getPostAnalytics(brandId, platformPostId, startDate, endDate, socialAccountId = null) {
    return facebookPost.getPostAnalytics(brandId, platformPostId, startDate, endDate, socialAccountId);
  }

  async checkReelCopyrightStatus(brandId, videoId, socialAccountId = null) {
    return facebookPost.checkReelCopyrightStatus(brandId, videoId, socialAccountId);
  }

  // --- Unsupported or Stub methods for LSP Compliance ---
  async trackVideo(brandId, videoUrl) {
    return null;
  }

  async getVideoDetails(brandId, videoId, socialAccountId = null) {
    try {
      return await facebookPost.getVideoDetails(brandId, videoId, socialAccountId);
    } catch (e) {
      console.error(`[FacebookService] getVideoDetails failed for post ${videoId}:`, e.message);
      return null;
    }
  }

  async searchChannel(brandId, query) {
    return facebookCompetitor.searchPages(brandId, query);
  }

  async addCompetitor(brandId, pageId) {
    return facebookCompetitor.addCompetitor(brandId, pageId);
  }

  async getCompetitors(brandId) {
    return facebookCompetitor.getCompetitors(brandId);
  }

  async deleteCompetitor(id, brandId, userId) {
    return facebookCompetitor.deleteCompetitor(id, brandId, userId);
  }

  async fetchChannelComments(brandId) {
    return facebookComment.fetchChannelComments(brandId);
  }

  async replyToComment(brandId, parentCommentId, text) {
    return facebookComment.replyToComment(brandId, parentCommentId, text);
  }
}

module.exports = new FacebookService();
