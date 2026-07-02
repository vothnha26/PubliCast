const tiktokGateway = require('./tiktok.gateway');
const tiktokAnalytics = require('./tiktok-analytics.service');
const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const { PLATFORMS, POST_STATUS } = require('../../../utils/constants');

class TikTokPostService {
  async publishPost(brandId, postData) {
    const socialAccount = await socialAccountRepository.findByBrandAndPlatformFirst(brandId, PLATFORMS.TIKTOK);
    if (!socialAccount) throw new Error('TikTok account not connected');

    if (socialAccount.accessToken && (socialAccount.accessToken.startsWith('mock-') || socialAccount.accessToken.includes('mock') || socialAccount.accessToken.startsWith('tt_mock'))) {
      console.log(`[TikTok] Mock publishing detected for mock token. Returning simulated success.`);
      return {
        platformVideoId: `mock-tiktok-post-${Date.now()}`,
        status: POST_STATUS.PUBLISHED,
        publishedAt: new Date()
      };
    }

    const { mediaUrls, title, caption } = postData;
    if (!mediaUrls || mediaUrls.length === 0) throw new Error('TikTok requires a video URL');

    const videoUrl = mediaUrls[0]; 
    const finalTitle = title || caption || 'New TikTok Post';

    // Get fresh token if expired based on metadata
    let account = await tiktokAnalytics.getOrRefreshAccount(socialAccount);

    let result;
    try {
      result = await tiktokGateway.publishVideo(account.accessToken, videoUrl, finalTitle);
    } catch (error) {
      // Force refresh if the token is invalid (even if database metadata said it was valid)
      const isTokenError = error.status === 401 || error.code === 'access_token_invalid';
      if (isTokenError && account.refreshToken) {
        console.log(`[TikTok Post] publishPost failed with token error. Attempting force refresh...`);
        try {
          const refreshed = await tiktokGateway.refreshAccessToken(account.refreshToken);
          const accessToken = refreshed.access_token;
          const refreshToken = refreshed.refresh_token || account.refreshToken;
          const expiryDate = refreshed.expires_in ? Date.now() + (refreshed.expires_in * 1000) : null;

          account = await socialAccountRepository.updateTokens(account.id, {
            access_token: accessToken,
            refresh_token: refreshToken,
            expiry_date: expiryDate
          });

          result = await tiktokGateway.publishVideo(account.accessToken, videoUrl, finalTitle);
        } catch (refreshError) {
          console.error(`[TikTok Post] Force refresh failed:`, refreshError.message);
          throw error; // Throw original token error
        }
      } else {
        throw error;
      }
    }

    return {
      platformVideoId: result.publish_id,
      status: POST_STATUS.PUBLISHED,
      publishedAt: new Date()
    };
  }
}

module.exports = new TikTokPostService();
