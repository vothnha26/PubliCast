const socialPlatformFactory = require('./social-platform.factory');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const googleDriveService = require('./google-drive.service');
const notificationService = require('../core/notification.service');
const redisClient = require('../../config/redis');
const { PLATFORMS, NOTIFICATION_TYPES } = require('../../utils/constants');

class SocialService {
  /**
   * Sync and aggregate metrics for all social accounts of a brand
   */
  async getAggregatedMetrics(brandId, startDate, endDate, force = false) {
    const cacheKey = `sync:metrics:${brandId}:${startDate || 'all'}:${endDate || 'all'}`;

    // Step 1: Redis Cache First (<5ms response, ZERO MySQL DB queries!)
    if (!force && redisClient.isOpen) {
      try {
        const cachedMetrics = await redisClient.get(cacheKey);
        if (cachedMetrics) {
          console.log(`[SocialService] Returning Redis cached metrics for brand ${brandId}`);
          return JSON.parse(cachedMetrics);
        }
      } catch (cacheErr) {
        console.warn(`[SocialService] Redis read failed, falling back to DB:`, cacheErr.message);
      }
    }

    const allAccounts = await socialAccountRepository.findByBrandAndPlatform(brandId, null); // passing null to platform to get all platforms
    const accounts = allAccounts.filter(account => socialPlatformFactory.isSupported(account.platform));

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

    // Optimization: When not forcing a fresh sync, save DB result to Redis Cache (TTL = 300s)
    // and trigger live API sync asynchronously in background.
    if (!force) {
      // Save MySQL DB snapshot to Redis Cache (300s TTL)
      if (redisClient.isOpen && accounts.length > 0) {
        redisClient.setEx(cacheKey, 300, JSON.stringify(accounts)).catch(err => {
          console.warn(`[SocialService] Redis write failed:`, err.message);
        });
      }

      // Trigger background sync non-blocking
      Promise.all(accounts.map(async (account) => {
        try {
          const service = socialPlatformFactory.getService(account.platform);
          await withTimeout(
            service.syncChannelMetrics(account.id, startDate, endDate, false),
            60000,
            account
          );
        } catch (err) {
          console.warn(`[SocialService] Background metrics sync error for ${account.platform}:`, err.message);
        }
      })).catch(() => {});

      return accounts;
    }

    // Force === true: Sync from live social APIs, update DB and refresh Redis Cache
    const freshAccounts = await Promise.all(accounts.map(async (account) => {
      try {
        const service = socialPlatformFactory.getService(account.platform);
        return await withTimeout(
          service.syncChannelMetrics(account.id, startDate, endDate, force),
          60000,
          account
        );
      } catch (error) {
        console.error(`Failed to sync metrics for ${error.platform || account.platform} (${account.id}):`, error.message);
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

    if (redisClient.isOpen && freshAccounts.length > 0) {
      redisClient.setEx(cacheKey, 300, JSON.stringify(freshAccounts)).catch(err => {
        console.warn(`[SocialService] Redis cache update on force sync failed:`, err.message);
      });
    }

    return freshAccounts;
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
   * Disconnect a social account from a brand
   */
  async disconnectAccount(brandId, platform) {
    if (platform && platform.toUpperCase() === PLATFORMS.YOUTUBE) {
      try {
        const youtubeAccount = await socialAccountRepository.findByBrandAndPlatformFirst(brandId, PLATFORMS.YOUTUBE);
        const isMockAccount = youtubeAccount && (
          (youtubeAccount.accessToken && youtubeAccount.accessToken.startsWith('mock-')) ||
          (youtubeAccount.platformAccountId && youtubeAccount.platformAccountId.startsWith('mock-'))
        );

        if (youtubeAccount && youtubeAccount.platformAccountId && !isMockAccount) {
          const channelId = youtubeAccount.platformAccountId;
          const callbackUrl = process.env.PUBLIC_WEBHOOK_URL
            ? `${process.env.PUBLIC_WEBHOOK_URL}/api/v1/social/youtube/pubsub/callback`
            : null;
          if (callbackUrl && channelId) {
            const youtubePubSubService = require('./youtube/youtube-pubsub.service');
            const { YOUTUBE_PUBSUB } = require('./youtube/youtube.constants');
            await youtubePubSubService.requestHubSubscription(channelId, callbackUrl, YOUTUBE_PUBSUB.MODE.UNSUBSCRIBE).catch(err => {
              console.error(`[SocialService] Failed to unsubscribe YouTube PubSub for channel ${channelId}:`, err.message);
            });
          }
        }
      } catch (err) {
        console.error('[SocialService] Error during YouTube PubSub unsubscribe on disconnect:', err.message);
      }
    }

    const result = await socialAccountRepository.deleteManyByBrandAndPlatform(brandId, platform);
    await this._notifyPlatformDisconnected(brandId, platform);

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
