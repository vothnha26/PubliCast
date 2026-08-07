const socialPlatformFactory = require('./social-platform.factory');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const googleDriveService = require('./google-drive.service');
const notificationService = require('../core/notification.service');
const { PLATFORMS, NOTIFICATION_TYPES } = require('../../utils/constants');
const logger = require('../../utils/logger');

// getAggregatedMetrics feeds both the client API response and (formerly)
// a Redis cache from the same repository result, which carries decrypted
// accessToken/refreshToken/scopes for calling each platform's API — fine
// internally, but neither the frontend (which never reads these) nor Redis
// (a second, unencrypted copy of live OAuth credentials with no reason to
// exist) should ever receive them.
const stripSensitiveAccountFields = (accounts) => accounts.map(({ accessToken, refreshToken, scopes, ...rest }) => rest);
const stripSensitiveAccountFieldsSingle = (account) => {
  if (!account) return account;
  const { accessToken, refreshToken, scopes, ...rest } = account;
  return rest;
};

class SocialService {
  /**
   * Read aggregated metrics for all social accounts of a brand — DB only,
   * never calls out to a platform's live API. The only things that call a
   * platform's real syncChannelMetrics are the 15-minute cron scheduler and
   * the initial OAuth connect (see social-metrics-sync-scheduler.service.js
   * and each platform's connectChannel) — this method just reads whatever
   * those already wrote, so a dashboard load/refresh never burns platform
   * API quota (YouTube's daily cap in particular) or needs a throttle lock.
   */
  async getAggregatedMetrics(brandId) {
    const allAccounts = await socialAccountRepository.findByBrandAndPlatform(brandId, null); // passing null to platform to get all platforms
    const accounts = allAccounts.filter(account => socialPlatformFactory.isSupported(account.platform));

    return stripSensitiveAccountFields(accounts);
  }

  /**
   * Get Google Drive context including connection status and account info
   */
  async getGoogleDriveContext(brandId) {
    try {
      const files = await googleDriveService.listVideos(brandId);
      const socialAccount = await socialAccountRepository.findByBrandAndPlatformFirst(brandId, PLATFORMS.GOOGLE_DRIVE);

      return {
        connected: true,
        data: files,
        account: socialAccount ? {
          displayName: socialAccount.displayName,
          username: socialAccount.username,
          profilePictureUrl: socialAccount.profilePictureUrl
        } : null
      };
    } catch (error) {
      console.error('Google Drive context failed:', error.message);
      return { connected: false, data: [], error: error.message };
    }
  }

  /**
   * Download a file from Google Drive to local storage
   */
  async downloadDriveFile(brandId, fileId, fileName) {
    return await googleDriveService.downloadFile(brandId, fileId, fileName);
  }

  /**
   * Disconnect a social account from a brand. If socialAccountId is given,
   * only that one account is removed — otherwise every account of the
   * platform is removed (legacy behavior, still correct for brands with a
   * single account per platform, which is the common case today).
   */
  async disconnectAccount(brandId, platform, socialAccountId = null) {
    const result = socialAccountId
      ? await socialAccountRepository.deleteByIdAndBrand(brandId, socialAccountId)
      : await socialAccountRepository.deleteManyByBrandAndPlatform(brandId, platform);
    await this._notifyPlatformDisconnected(brandId, platform);

    return result;
  }

  /**
   * Mark one account as the default for its platform within a brand — a
   * display-only hint (pre-checked by default in the post composer), not
   * enforced anywhere else. Scoped to brandId so a caller can't flip the
   * default flag on another brand's account.
   */
  async setDefaultAccount(brandId, socialAccountId) {
    const account = await socialAccountRepository.findById(socialAccountId);
    if (!account || account.brandId !== brandId) {
      const error = new Error('Social account not found');
      error.statusCode = 404;
      throw error;
    }

    await socialAccountRepository.setDefault(brandId, account.platform, socialAccountId);
    // findById returns decrypted accessToken/refreshToken — this result
    // instead flows straight into the controller's res.json(), so it must be
    // stripped the same way getAggregatedMetrics's response is.
    const updated = await socialAccountRepository.findById(socialAccountId);
    return stripSensitiveAccountFieldsSingle(updated);
  }

  async _notifyPlatformDisconnected(brandId, platform) {
    try {
      await notificationService.notifyBrandMembers(brandId, {
        type: NOTIFICATION_TYPES.PLATFORM,
        title: `${platform} disconnected`,
        message: `${platform} has been disconnected. Reconnect it to keep publishing and syncing analytics.`,
        actionUrl: '/manage/connections'
      }, 'notifyChannelDisconnect');
    } catch (err) {
      console.error(`[SocialService] Failed to create ${platform} disconnect notification:`, err.message);
    }
  }

  async _notifyPlatformSyncFailure(account, error) {
    try {
      await notificationService.notifyBrandMembers(account.brandId, {
        type: NOTIFICATION_TYPES.PLATFORM,
        title: `${account.platform} sync failed`,
        message: `${account.platform} could not sync analytics. ${error.message || 'Reconnect the platform to continue syncing.'}`,
        actionUrl: '/manage/connections'
      }, 'notifyChannelDisconnect');
    } catch (err) {
      console.error(`[SocialService] Failed to create ${account.platform} sync failure notification:`, err.message);
    }
  }
}

module.exports = new SocialService();
