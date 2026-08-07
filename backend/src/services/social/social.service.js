const socialPlatformFactory = require('./social-platform.factory');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const brandRepository = require('../../repositories/workspace/brand.repository');
const googleDriveService = require('./google-drive.service');
const notificationService = require('../core/notification.service');
const redisClient = require('../../config/redis');
const { PLATFORMS, NOTIFICATION_TYPES } = require('../../utils/constants');
const logger = require('../../utils/logger');

// Fallback when a brand has no active subscription — same conservative
// (FREE-tier) default used by each platform's own post-history service.
const DEFAULT_HISTORY_WINDOW_MONTHS = 1;

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

// How often the background sync (a real call to each platform's API) is
// allowed to fire per brand+date-range. This used to be a side effect of
// caching the full accounts payload in Redis (a HIT skipped the sync
// entirely) — but that payload is 20-40KB+ per account (each account's
// most recent Analytics row embeds 31 days of growth/balance/clicks data,
// double-JSON-encoded), multiplied by every brand, re-written on every
// cache miss. The client already has its own copy of this data (React
// state) and re-fetches it via the `data_invalidate` socket event fired at
// the end of a sync — so caching the payload just to skip a DB read bought
// nothing a client wouldn't already have. What actually mattered was
// distinct: not hammering platform APIs like YouTube, which has a hard
// daily quota (see QuotaTrackerService), on every page load/refresh. This
// key preserves only that throttle — a few bytes, not the payload.
const METRICS_SYNC_THROTTLE_SECONDS = 300;
const metricsSyncThrottleKey = (brandId) => `sync:metrics-throttle:${brandId}`;

class SocialService {
  async _getHistoryWindowMonths(brandId) {
    const brand = await brandRepository.findBrandWithSubscription(brandId);
    const planLimit = brand?.subscription?.status === 'ACTIVE' ? brand.subscription.plan?.planLimit : null;
    return planLimit?.historyWindowMonths || DEFAULT_HISTORY_WINDOW_MONTHS;
  }

  /**
   * Clamp a requested startDate to the brand's plan-based history window,
   * so a client can't read further back than their plan allows just by
   * passing an arbitrary startDate query param (the date-range picker's
   * "premium" presets are a UI hint only — this is the actual enforcement).
   */
  async _clampStartDate(brandId, startDate) {
    const windowMonths = await this._getHistoryWindowMonths(brandId);
    const earliestAllowed = new Date();
    earliestAllowed.setMonth(earliestAllowed.getMonth() - windowMonths);
    const earliestAllowedStr = earliestAllowed.toISOString().slice(0, 10);

    if (!startDate || startDate < earliestAllowedStr) {
      return earliestAllowedStr;
    }
    return startDate;
  }

  /**
   * Sync and aggregate metrics for all social accounts of a brand
   */
  async getAggregatedMetrics(brandId, startDate, endDate, force = false) {
    startDate = await this._clampStartDate(brandId, startDate);

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

    // Always return a fresh DB read — the client already holds its own copy
    // (React state) and re-fetches on the `data_invalidate` socket event
    // fired below, so there's nothing to gain from caching this payload.
    // What still needs guarding is the background sync a few lines down: it
    // calls out to each platform's real API (YouTube has a hard daily
    // quota), so repeated page loads/refreshes across every open tab and
    // device for this brand must not each trigger their own live sync.
    // SET...NX is the gate: only the request that wins it proceeds to sync;
    // everyone else within the throttle window just returns the DB read.
    if (!force) {
      let shouldSync = true;
      if (redisClient.isOpen) {
        try {
          const acquired = await redisClient.set(
            metricsSyncThrottleKey(brandId),
            '1',
            { NX: true, EX: METRICS_SYNC_THROTTLE_SECONDS }
          );
          shouldSync = acquired === 'OK';
        } catch (throttleErr) {
          console.warn(`[SocialService] Redis throttle check failed, syncing anyway:`, throttleErr.message);
        }
      }

      if (shouldSync) {
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
        })).then(() => {
          // Notify connected client browsers via Socket to invalidate & refetch fresh metrics
          const socketInvalidationService = require('../core/socket-invalidation.service');
          const { CACHE_SCOPES } = require('../../utils/socket-constants');
          socketInvalidationService.invalidateBrandScope(brandId, CACHE_SCOPES.METRICS);
        }).catch(() => {});
      }

      return stripSensitiveAccountFields(accounts);
    }

    // Force === true: Sync from live social APIs and update DB, bypassing the throttle
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

    // A force sync just did the real work the throttle exists to gate, so
    // refresh it — otherwise a !force request landing right after would see
    // no throttle key and immediately trigger a redundant background sync.
    if (redisClient.isOpen) {
      redisClient.set(metricsSyncThrottleKey(brandId), '1', { EX: METRICS_SYNC_THROTTLE_SECONDS }).catch(err => {
        console.warn(`[SocialService] Redis throttle refresh after force sync failed:`, err.message);
      });
    }

    return stripSensitiveAccountFields(freshAccounts);
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
    if (platform && platform.toUpperCase() === PLATFORMS.YOUTUBE) {
      try {
        // When a socialAccountId is given, unsubscribe exactly that channel —
        // findByBrandAndPlatformFirst would pick an arbitrary one otherwise,
        // wrong when the brand has multiple YouTube channels.
        const youtubeAccount = socialAccountId
          ? await socialAccountRepository.findById(socialAccountId)
          : await socialAccountRepository.findByBrandAndPlatformFirst(brandId, PLATFORMS.YOUTUBE);
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
    // findById returns decrypted accessToken/refreshToken (needed by internal
    // callers like disconnectAccount's YouTube-PubSub check above) — this
    // result instead flows straight into the controller's res.json(), so it
    // must be stripped the same way getAggregatedMetrics's response is.
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
