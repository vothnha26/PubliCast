const socialPlatformFactory = require('./social-platform.factory');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const googleDriveService = require('./google-drive.service');
const notificationService = require('../core/notification.service');
const { PLATFORMS, NOTIFICATION_TYPES } = require('../../utils/constants');

class SocialService {
  /**
   * Sync and aggregate metrics for all social accounts of a brand
   */
  async getAggregatedMetrics(brandId, startDate, endDate, force = false) {
    const accounts = await socialAccountRepository.findByBrandAndPlatform(brandId, null); // passing null to platform to get all platforms

    const withTimeout = (promise, ms = 60000, fallback) => {
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Timeout of ${ms}ms exceeded syncing platform`));
        }, ms);
      });
      return Promise.race([promise, timeoutPromise])
        .catch(async (err) => {
          console.warn(`[SocialService] Sync failed or timed out for ${fallback.platform}: ${err.message}. Using fallback account.`);
          const errMsg = (err.message || '').toLowerCase();
          const isNetworkOrTimeout = errMsg.includes('timeout') || 
                                     errMsg.includes('etimedout') || 
                                     errMsg.includes('enotfound') || 
                                     errMsg.includes('econnreset') ||
                                     errMsg.includes('econnrefused') ||
                                     errMsg.includes('fetch failed');
          if (!isNetworkOrTimeout) {
            await this._notifyPlatformSyncFailure(fallback, err);
          }
          return fallback;
        })
        .finally(() => {
          clearTimeout(timeoutId);
        });
    };

    return await Promise.all(accounts.map(async (account) => {
      try {
        const service = socialPlatformFactory.getService(account.platform);
        return await withTimeout(
          service.syncChannelMetrics(account.id, startDate, endDate, force),
          60000,
          account
        );
      } catch (error) {
        console.error(`Failed to sync metrics for ${account.platform} (${account.id}):`, error.message);
        const errMsg = (error.message || '').toLowerCase();
        const isNetworkOrTimeout = errMsg.includes('timeout') || 
                                   errMsg.includes('etimedout') || 
                                   errMsg.includes('enotfound') || 
                                   errMsg.includes('econnreset') ||
                                   errMsg.includes('econnrefused') ||
                                   errMsg.includes('fetch failed');
        if (!isNetworkOrTimeout) {
          await this._notifyPlatformSyncFailure(account, error);
        }
        return account; 
      }
    }));
  }

  /**
   * Get Google Drive context including connection status and account info
   */
  async getGoogleDriveContext(brandId) {
    try {
      const files = await googleDriveService.listVideos(brandId);
      const socialAccount = await socialAccountRepository.findByBrandAndPlatformFirst(brandId, PLATFORMS.YOUTUBE);

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
   * Disconnect a social account from a brand
   */
  async disconnectAccount(brandId, platform) {
    const result = await socialAccountRepository.deleteManyByBrandAndPlatform(brandId, platform);
    await this._notifyPlatformDisconnected(brandId, platform);

    const syncPostAnalyticsService = require('./sync-post-analytics.service');
    await syncPostAnalyticsService.cleanupOrphanSnapshotsForBrandPlatform(brandId, platform).catch(err => {
      console.error(`[SocialService] Failed to cleanup orphan snapshots for ${platform}:`, err.message);
    });

    return result;
  }

  async _notifyPlatformDisconnected(brandId, platform) {
    try {
      await notificationService.create({
        brandId,
        type: NOTIFICATION_TYPES.PLATFORM,
        title: `${platform} disconnected`,
        message: `${platform} has been disconnected. Reconnect it to keep publishing and syncing analytics.`,
        actionUrl: '/manage/connections'
      });
    } catch (err) {
      console.error(`[SocialService] Failed to create ${platform} disconnect notification:`, err.message);
    }
  }

  async _notifyPlatformSyncFailure(account, error) {
    try {
      await notificationService.create({
        brandId: account.brandId,
        type: NOTIFICATION_TYPES.PLATFORM,
        title: `${account.platform} sync failed`,
        message: `${account.platform} could not sync analytics. ${error.message || 'Reconnect the platform to continue syncing.'}`,
        actionUrl: '/manage/connections'
      });
    } catch (err) {
      console.error(`[SocialService] Failed to create ${account.platform} sync failure notification:`, err.message);
    }
  }
}

module.exports = new SocialService();
