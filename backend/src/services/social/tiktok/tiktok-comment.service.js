const tiktokGateway = require('./tiktok.gateway');
const tiktokAnalytics = require('./tiktok-analytics.service');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const { PLATFORMS } = require('../../../utils/constants');
const logger = require('../../../utils/logger');

class TikTokCommentService {
  /**
   * Query top-level comments for a video or replies for a comment
   */
  async getVideoComments(brandId, { videoId = null, commentId = null, maxCount = 10, cursor = 0, socialAccountId = null } = {}) {
    if (!videoId && !commentId) {
      throw new Error('Either videoId or commentId must be specified to fetch TikTok comments');
    }

    try {
      let account = await this._getAccount(brandId, socialAccountId);

      // Handle mock account
      if (account && (
        (account.accessToken && account.accessToken.startsWith('mock-')) ||
        (account.platformAccountId && account.platformAccountId.startsWith('mock-'))
      )) {
        return this._getMockComments(videoId, commentId);
      }

      account = await tiktokAnalytics.getOrRefreshAccount(account);

      let response;
      try {
        response = await tiktokGateway.getVideoComments(account.accessToken, {
          videoId,
          commentId,
          maxCount,
          cursor
        });
      } catch (error) {
        const isTokenError = error.status === 401 || error.code === 'access_token_invalid';
        if (isTokenError && account.refreshToken) {
          logger.debug(`[TikTok Comment] Token error. Attempting force refresh...`);
          const refreshed = await tiktokGateway.refreshAccessToken(account.refreshToken);
          const accessToken = refreshed.access_token;
          const refreshToken = refreshed.refresh_token || account.refreshToken;
          const expiryDate = refreshed.expires_in ? Date.now() + (refreshed.expires_in * 1000) : null;

          account = await socialAccountRepository.updateTokens(account.id, {
            access_token: accessToken,
            refresh_token: refreshToken,
            expiry_date: expiryDate
          });

          response = await tiktokGateway.getVideoComments(account.accessToken, {
            videoId,
            commentId,
            maxCount,
            cursor
          });
        } else {
          throw error;
        }
      }

      if (!response || !response.comments) {
        return { comments: [], cursor: null, hasMore: false };
      }

      return {
        comments: this._formatComments(response.comments),
        cursor: response.has_more ? response.cursor?.toString() || null : null,
        hasMore: Boolean(response.has_more)
      };
    } catch (err) {
      if (err.message.includes('TikTok account not connected')) {
        return { comments: [], cursor: null, hasMore: false };
      }
      throw err;
    }
  }

  async _getAccount(brandId, socialAccountId = null) {
    if (socialAccountId && String(socialAccountId).startsWith('mock')) {
      return { id: socialAccountId, accessToken: String(socialAccountId), platformAccountId: String(socialAccountId) };
    }
    let account;
    if (socialAccountId) {
      account = await socialAccountRepository.findById(socialAccountId);
    } else {
      const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.TIKTOK);
      if (!socialAccount || socialAccount.length === 0) {
        throw new Error('TikTok account not connected');
      }
      account = socialAccount[0];
    }
    if (!account || (brandId && (account.brandId || account.brand_id) && String(account.brandId || account.brand_id) !== String(brandId))) {
      throw new Error('TikTok account not connected or does not belong to this brand');
    }
    return account;
  }

  _formatComments(comments) {
    return comments.map(c => ({
      id: String(c.id),
      videoId: c.video_id ? String(c.video_id) : null,
      parentCommentId: c.parent_comment_id ? String(c.parent_comment_id) : null,
      text: c.text || '',
      likeCount: c.like_count || 0,
      replyCount: c.reply_count || 0,
      authorName: c.display_name || 'TikTok User',
      createdAt: c.create_time ? new Date(c.create_time * 1000).toISOString() : new Date().toISOString(),
      platform: PLATFORMS.TIKTOK
    }));
  }

  _getMockComments(videoId, commentId) {
    return {
      comments: [
        {
          id: commentId ? `mock-reply-1` : `mock-comment-1`,
          videoId: videoId ? String(videoId) : "12345678901",
          parentCommentId: commentId ? String(commentId) : null,
          text: commentId ? "Replying to your TikTok comment! 🔥" : "Amazing video! Love this TikTok content 🚀",
          likeCount: 12,
          replyCount: commentId ? 0 : 2,
          authorName: "CodeChick",
          createdAt: new Date().toISOString(),
          platform: PLATFORMS.TIKTOK
        }
      ],
      cursor: null,
      hasMore: false
    };
  }
}

module.exports = new TikTokCommentService();
