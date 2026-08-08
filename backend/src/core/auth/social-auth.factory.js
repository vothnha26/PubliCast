const googleOAuthService = require('../../services/social/google-oauth.service');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const { PLATFORMS } = require('../../utils/constants');
const logger = require('../../utils/logger');

/**
 * SocialAuthFactory
 * SRP: Chịu trách nhiệm tìm active account của thương hiệu (Brand) theo Platform
 * và cấp Auth Client đã được cấu hình refresh token token listener.
 */
class SocialAuthFactory {
  /**
   * Lấy Auth client & socialAccountId cho brand & platform
   * @param {string} brandId
   * @param {string} platform - e.g. PLATFORMS.YOUTUBE
   * @returns {Promise<{ auth: object, socialAccountId: string }|null>}
   */
  async getAuthClient(brandId, platform) {
    const platformKey = platform.toUpperCase();

    if (platformKey === PLATFORMS.YOUTUBE) {
      return this._getYouTubeAuthClient(brandId);
    }

    // Các nền tảng khác sẽ được tích hợp tương tự khi mở rộng
    return null;
  }

  async _getYouTubeAuthClient(brandId) {
    const accounts = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.YOUTUBE);
    if (!accounts || accounts.length === 0) return null;

    const active = accounts.find(acc =>
      !(acc.accessToken && acc.accessToken.startsWith('mock-')) &&
      !(acc.platformAccountId && acc.platformAccountId.startsWith('mock-'))
    ) || accounts[0];

    if (active.accessToken && active.accessToken.startsWith('mock-')) return null;

    const auth = this._createYouTubeAuthenticatedClient(active);
    return { auth, socialAccountId: active.id };
  }

  _createYouTubeAuthenticatedClient(account) {
    const client = googleOAuthService.createClient();
    client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      expiry_date: account.tokenExpiresAt ? account.tokenExpiresAt.getTime() : undefined
    });

    client.on('tokens', async (tokens) => {
      try {
        if (tokens.refresh_token) {
          await socialAccountRepository.updateTokens(account.id, tokens);
        } else if (tokens.access_token) {
          await socialAccountRepository.updateTokens(account.id, {
            ...tokens,
            refresh_token: account.refreshToken
          });
        }
      } catch (err) {
        logger.warn(`[SocialAuthFactory] Error updating tokens for account ${account.id}: ${err.message}`);
      }
    });

    return client;
  }
}

module.exports = new SocialAuthFactory();
