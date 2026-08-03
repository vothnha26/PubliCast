const youtubeService = require('./youtube');
const facebookService = require('./facebook');
const tiktokService = require('./tiktok');
const instagramService = require('./instagram');
const telegramService = require('./telegram');
const threadsService = require('./threads');
const { blueskyService } = require('./bluesky');
const redditService = require('./reddit/reddit.service');
const { twitchService } = require('./twitch');
const MockSocialService = require('./mock-social.service');
const createSyncCacheProxy = require('./sync-cache.proxy');
const appConfig = require('../../config/app.config');
const { PLATFORMS } = require('../../utils/constants');
const logger = require('../../utils/logger');

class SocialPlatformFactory {
  constructor() {
    this.services = {
      [PLATFORMS.YOUTUBE]: createSyncCacheProxy(youtubeService),
      [PLATFORMS.FACEBOOK]: createSyncCacheProxy(facebookService),
      [PLATFORMS.TIKTOK]: createSyncCacheProxy(tiktokService),
      [PLATFORMS.INSTAGRAM]: createSyncCacheProxy(instagramService),
      [PLATFORMS.TELEGRAM]: createSyncCacheProxy(telegramService),
      [PLATFORMS.THREADS]: createSyncCacheProxy(threadsService),
      [PLATFORMS.BLUESKY]: createSyncCacheProxy(blueskyService),
      [PLATFORMS.REDDIT]: createSyncCacheProxy(redditService),
      [PLATFORMS.TWITCH]: createSyncCacheProxy(twitchService),
    };
  }

  /**
   * Lấy service tương ứng với nền tảng mạng xã hội
   * @param {string} platform - Tên nền tảng (ví dụ: 'YOUTUBE')
   * @returns {BaseSocialService}
   */
  getService(platform) {
    if (!platform) {
      throw new Error('Platform is required');
    }
    const platformKey = platform.toUpperCase();

    // Nếu chế độ sandbox được kích hoạt cho việc đăng bài, trả về Mock service
    if (appConfig.sandbox.publish) {
      logger.debug(`🔌 [SocialPlatformFactory] Active Sandbox mode: Using MockSocialService for platform: ${platformKey}`);
      return new MockSocialService(platformKey);
    }

    const service = this.services[platformKey];
    if (!service) {
      throw new Error(`Platform '${platform}' is not supported yet`);
    }
    return service;
  }

  /**
   * Whether this platform has a registered syncChannelMetrics-capable service.
   * Used by callers (e.g. SocialService.getAggregatedMetrics) that iterate
   * over ALL of a brand's connected accounts to skip platforms like
   * GOOGLE_DRIVE, which is a media-source integration, not a publishable/
   * analyzable social channel, and has no entry in `this.services`.
   */
  isSupported(platform) {
    if (!platform) return false;
    return !!this.services[platform.toUpperCase()];
  }
}

module.exports = new SocialPlatformFactory();
