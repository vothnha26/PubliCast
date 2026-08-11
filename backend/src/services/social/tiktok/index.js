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
    return this.executeConnectPipeline(brandId, code, redirectUri, { codeVerifier });
  }

  // --- Connect Pipeline Hook Implementations ---
  // TikTok has no per-day analytics endpoint (see tiktok-analytics.service.js
  // class doc) — nothing to backfill in the background, so this stays on the
  // Template Method purely for architectural consistency with the other
  // platforms, not for a performance win. connectBackfillHistory is left as
  // the base class's no-op default.
  async connectExchangeAuth(code, redirectUri, { codeVerifier }) {
    const tiktokGateway = require('./tiktok.gateway');
    const tokenData = await tiktokGateway.exchangeCodeForToken(code, redirectUri, codeVerifier);
    return { tokenData };
  }

  async connectFetchIdentity({ tokenData }) {
    const tiktokGateway = require('./tiktok.gateway');
    const userInfo = await tiktokGateway.getUserInfo(tokenData.access_token);
    return {
      pageId: userInfo.open_id,
      username: userInfo.username || userInfo.display_name || 'TikTok User',
      displayName: userInfo.display_name || 'TikTok User',
      profilePictureUrl: userInfo.avatar_url || '',
      followersCount: userInfo.follower_count || 0,
      followingCount: userInfo.following_count || 0,
      likesCount: userInfo.likes_count || 0,
      videoCount: userInfo.video_count || 0
    };
  }

  async connectPersistAccount(brandId, identity, { tokenData }) {
    const { ConnectionConflictGuard, ConnectionConflictError } = require('../connection-conflict.guard');
    const { PLATFORMS } = require('../../../utils/constants');
    const conflictResult = await ConnectionConflictGuard.validateConflict(brandId, PLATFORMS.TIKTOK, identity.pageId);
    if (conflictResult.conflict) {
      throw new ConnectionConflictError(
        conflictResult.type,
        identity.displayName,
        identity.pageId,
        PLATFORMS.TIKTOK,
        conflictResult.existingAccount.brand.name
      );
    }

    const socialAccountRepository = require('../../../repositories/social/social-account.repository');
    return socialAccountRepository.upsertTikTokAccount(brandId, identity, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expires_in ? Date.now() + (tokenData.expires_in * 1000) : null,
      scope: tokenData.scope || 'user.info.basic,user.info.stats,video.list,video.publish'
    });
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
