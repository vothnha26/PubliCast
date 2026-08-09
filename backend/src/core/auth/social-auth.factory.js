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
   * @param {string} [socialAccountId] - Optional specific social account ID
   * @returns {Promise<{ auth: object, socialAccountId: string }|null>}
   */
  async getAuthClient(brandId, platform, socialAccountId = null) {
    const platformKey = platform.toUpperCase();

    if (platformKey === PLATFORMS.YOUTUBE) {
      return this._getYouTubeAuthClient(brandId, socialAccountId);
    }
    if (platformKey === PLATFORMS.FACEBOOK) {
      return this._getFacebookAuthClient(brandId, socialAccountId);
    }
    if (platformKey === PLATFORMS.INSTAGRAM) {
      return this._getInstagramAuthClient(brandId, socialAccountId);
    }
    if (platformKey === PLATFORMS.TIKTOK) {
      return this._getTikTokAuthClient(brandId, socialAccountId);
    }
    if (platformKey === PLATFORMS.THREADS) {
      return this._getThreadsAuthClient(brandId, socialAccountId);
    }
    if (platformKey === PLATFORMS.BLUESKY) {
      return this._getBlueskyAuthClient(brandId, socialAccountId);
    }

    return null;
  }

  async _getInstagramAuthClient(brandId, socialAccountId = null) {
    let accounts;
    if (socialAccountId) {
      const acc = await socialAccountRepository.findById(socialAccountId);
      if (!acc || (brandId && String(acc.brandId) !== String(brandId))) {
        throw new Error(`Social account ${socialAccountId} not found for brand ${brandId}`);
      }
      accounts = [acc];
    } else {
      accounts = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.INSTAGRAM);
    }
    if (!accounts || accounts.length === 0) return null;

    const active = accounts.find(acc => !(acc.accessToken && acc.accessToken.startsWith('mock-'))) || accounts[0];

    return { auth: { accessToken: active.accessToken }, socialAccountId: active.id, account: active };
  }

  async _getTikTokAuthClient(brandId, socialAccountId = null) {
    let accounts;
    if (socialAccountId) {
      const acc = await socialAccountRepository.findById(socialAccountId);
      if (!acc || (brandId && String(acc.brandId) !== String(brandId))) {
        throw new Error(`Social account ${socialAccountId} not found for brand ${brandId}`);
      }
      accounts = [acc];
    } else {
      accounts = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.TIKTOK);
    }
    if (!accounts || accounts.length === 0) return null;

    const active = accounts.find(acc => !(acc.accessToken && acc.accessToken.startsWith('mock-'))) || accounts[0];
    if (active.accessToken && active.accessToken.startsWith('mock-')) return null;

    const tiktokAnalytics = require('../../services/social/tiktok/tiktok-analytics.service');
    const refreshedAccount = await tiktokAnalytics.getOrRefreshAccount(active);

    return { auth: refreshedAccount.accessToken, socialAccountId: refreshedAccount.id, account: refreshedAccount };
  }

  async _getYouTubeAuthClient(brandId, socialAccountId = null) {
    let accounts;
    if (socialAccountId) {
      const acc = await socialAccountRepository.findById(socialAccountId);
      if (!acc || (brandId && String(acc.brandId) !== String(brandId))) {
        // A caller-supplied socialAccountId belonging to a different brand
        // must fail loudly here — silently falling back to some other
        // account of this brand/platform (as before) would let a request
        // scoped to one account operate against a different one instead.
        throw new Error(`Social account ${socialAccountId} not found for brand ${brandId}`);
      }
      accounts = [acc];
    } else {
      accounts = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.YOUTUBE);
    }
    if (!accounts || accounts.length === 0) return null;

    const active = accounts.find(acc =>
      !(acc.accessToken && acc.accessToken.startsWith('mock-')) &&
      !(acc.platformAccountId && acc.platformAccountId.startsWith('mock-'))
    ) || accounts[0];

    if (active.accessToken && active.accessToken.startsWith('mock-')) return null;

    const auth = this._createYouTubeAuthenticatedClient(active);
    return { auth, socialAccountId: active.id };
  }

  async _getFacebookAuthClient(brandId, socialAccountId = null) {
    let accounts;
    if (socialAccountId) {
      const acc = await socialAccountRepository.findById(socialAccountId);
      if (!acc || (brandId && String(acc.brandId) !== String(brandId))) {
        throw new Error(`Social account ${socialAccountId} not found for brand ${brandId}`);
      }
      accounts = [acc];
    } else {
      accounts = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.FACEBOOK);
    }
    if (!accounts || accounts.length === 0) return null;

    const active = accounts.find(acc => !(acc.accessToken && acc.accessToken.startsWith('mock-'))) || accounts[0];

    // Facebook Graph API uses raw access token string as auth credential
    return { auth: active.accessToken, socialAccountId: active.id, account: active };
  }

  async _getThreadsAuthClient(brandId, socialAccountId = null) {
    let accounts;
    if (socialAccountId) {
      const acc = await socialAccountRepository.findById(socialAccountId);
      if (!acc || (brandId && String(acc.brandId) !== String(brandId))) {
        throw new Error(`Social account ${socialAccountId} not found for brand ${brandId}`);
      }
      accounts = [acc];
    } else {
      accounts = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.THREADS);
    }
    if (!accounts || accounts.length === 0) return null;

    const active = accounts.find(acc => !(acc.accessToken && acc.accessToken.startsWith('mock-'))) || accounts[0];
    return { auth: { accessToken: active.accessToken }, socialAccountId: active.id, account: active };
  }

  async _getBlueskyAuthClient(brandId, socialAccountId = null) {
    let accounts;
    if (socialAccountId) {
      const acc = await socialAccountRepository.findById(socialAccountId);
      if (!acc || (brandId && String(acc.brandId) !== String(brandId))) {
        throw new Error(`Social account ${socialAccountId} not found for brand ${brandId}`);
      }
      accounts = [acc];
    } else {
      accounts = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.BLUESKY);
    }
    if (!accounts || accounts.length === 0) return null;

    const active = accounts.find(acc => !(acc.accessToken && acc.accessToken.startsWith('mock-'))) || accounts[0];
    const blueskyService = require('../../services/social/bluesky/bluesky.service');
    const agent = await blueskyService.getAgentForAccount(active);

    return { auth: { agent, accessToken: active.accessToken }, socialAccountId: active.id, account: active };
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
