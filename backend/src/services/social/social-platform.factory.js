const youtubeService = require('./youtube');
const facebookService = require('./facebook');
const tiktokService = require('./tiktok');
const instagramService = require('./instagram');
const telegramService = require('./telegram');
const threadsService = require('./threads');
const MockSocialService = require('./mock-social.service');
const createSyncCacheProxy = require('./sync-cache.proxy');
const appConfig = require('../../config/app.config');
const { PLATFORMS } = require('../../utils/constants');

class SocialPlatformFactory {
  constructor() {
    this.services = {
      [PLATFORMS.YOUTUBE]: createSyncCacheProxy(youtubeService),
      [PLATFORMS.FACEBOOK]: createSyncCacheProxy(facebookService),
      [PLATFORMS.TIKTOK]: createSyncCacheProxy(tiktokService),
      [PLATFORMS.INSTAGRAM]: createSyncCacheProxy(instagramService),
      [PLATFORMS.TELEGRAM]: createSyncCacheProxy(telegramService),
      [PLATFORMS.THREADS]: createSyncCacheProxy(threadsService),
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
      console.log(`🔌 [SocialPlatformFactory] Active Sandbox mode: Using MockSocialService for platform: ${platformKey}`);
      return new MockSocialService(platformKey);
    }

    const service = this.services[platformKey];
    if (!service) {
      throw new Error(`Platform '${platform}' is not supported yet`);
    }
    return service;
  }
}

module.exports = new SocialPlatformFactory();
