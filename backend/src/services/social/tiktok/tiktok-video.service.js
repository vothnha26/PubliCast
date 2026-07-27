const tiktokGateway = require('./tiktok.gateway');
const tiktokAnalytics = require('./tiktok-analytics.service');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const { PLATFORMS, POST_STATUS } = require('../../../utils/constants');

class TikTokVideoService {
  async getPublishedVideos(brandId, pageToken = 0, limit = 10, socialAccountId = null) {
    try {
      let account = await this._getAccount(brandId, socialAccountId);
      
      if (account && (
        (account.accessToken && account.accessToken.startsWith('mock-')) ||
        (account.platformAccountId && account.platformAccountId.startsWith('mock-'))
      )) {
        return { videos: [], nextPageToken: null, prevPageToken: null };
      }
      
      // pageToken in TikTok is usually the cursor. If it's a string, try to parse it.
      const cursor = parseInt(pageToken) || 0;
      const maxCount = parseInt(limit) || 10;
      
      // Get fresh token if expired based on metadata
      account = await tiktokAnalytics.getOrRefreshAccount(account);
      
      let response;
      try {
        response = await tiktokGateway.getVideoList(account.accessToken, cursor, maxCount);
      } catch (error) {
        // Force refresh if the token is invalid (even if database metadata said it was valid)
        const isTokenError = error.status === 401 || error.code === 'access_token_invalid';
        if (isTokenError && account.refreshToken) {
          console.log(`[TikTok Video] getVideoList failed with token error. Attempting force refresh...`);
          const refreshed = await tiktokGateway.refreshAccessToken(account.refreshToken);
          const accessToken = refreshed.access_token;
          const refreshToken = refreshed.refresh_token || account.refreshToken;
          const expiryDate = refreshed.expires_in ? Date.now() + (refreshed.expires_in * 1000) : null;

          account = await socialAccountRepository.updateTokens(account.id, {
            access_token: accessToken,
            refresh_token: refreshToken,
            expiry_date: expiryDate
          });

          response = await tiktokGateway.getVideoList(account.accessToken, cursor, maxCount);
        } else {
          throw error;
        }
      }
      
      if (!response || !response.videos) {
        return { videos: [], nextPageToken: null, prevPageToken: null };
      }
      
      const formattedVideos = this._formatVideoList(response.videos);
      
      return {
        videos: formattedVideos,
        nextPageToken: response.has_more ? response.cursor.toString() : null,
        prevPageToken: cursor > 0 ? '0' : null // Simple fallback for prev token
      };
    } catch (err) {
      if (err.message.includes('TikTok account not connected')) {
        return { videos: [], nextPageToken: null, prevPageToken: null };
      }
      throw err;
    }
  }

  async _getAccount(brandId, socialAccountId = null) {
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
    if (!account) {
      throw new Error('TikTok account not connected');
    }
    return account;
  }

  _formatVideoList(videos) {
    return videos.map(v => ({
      id: v.id,
      title: v.title || v.video_description,
      thumbnailUrl: v.cover_image_url,
      publishedAt: new Date(v.create_time * 1000), // TikTok uses unix timestamp in seconds
      views: v.view_count || 0,
      likes: v.like_count || 0,
      comments: v.comment_count || 0,
      shares: v.share_count || 0,
      duration: v.duration || 0,
      status: POST_STATUS.PUBLISHED,
      platform: 'TIKTOK',
      postUrl: v.share_url || `https://www.tiktok.com/video/${v.id}`,
      shareUrl: v.share_url || `https://www.tiktok.com/video/${v.id}`
    }));
  }
}

module.exports = new TikTokVideoService();
