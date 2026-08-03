const BaseSocialService = require('./base-social.service');
const logger = require('../../utils/logger');

class MockSocialService extends BaseSocialService {
  constructor(platformName) {
    super();
    this.platformName = platformName || 'MockPlatform';
  }

  async publishPost(brandId, postData) {
    logger.debug('\n==================================================');
    logger.debug(`🚀 [SocialPublish/Sandbox] NEW OUTGOING POST DETECTED`);
    logger.debug(`Platform:    ${this.platformName}`);
    logger.debug(`Brand ID:    ${brandId}`);
    logger.debug(`Title:       ${postData.title || '(No Title)'}`);
    logger.debug(`Type:        ${postData.type || 'TEXT'}`);
    logger.debug(`Media URLs:  ${postData.mediaUrls ? postData.mediaUrls.join(', ') : 'None'}`);
    logger.debug('--------------------------------------------------');
    logger.debug(`Caption:\n${postData.caption}`);
    logger.debug('==================================================\n');

    return {
      success: true,
      platformPostId: `mock_${this.platformName.toLowerCase()}_${Date.now()}`,
      url: `https://mock-${this.platformName.toLowerCase()}.com/post/mock_${Date.now()}`
    };
  }

  async getChannelInfo(auth, startDate, endDate) {
    return {
      channelId: `mock_${this.platformName.toLowerCase()}_channel`,
      title: `Mock ${this.platformName} Channel`,
      subscriberCount: 15420,
      viewCount: 450120,
      videoCount: 42
    };
  }

  async syncChannelMetrics(socialAccountId, startDate, endDate) {
    return {
      success: true,
      metricsSynced: 12,
      platform: this.platformName
    };
  }

  async deletePost(brandId, platformPostId) {
    logger.debug(`[SocialPublish/Sandbox] Deleted post ${platformPostId} from brand ${brandId} on ${this.platformName}`);
    return { success: true, message: 'Deleted mock post successfully.' };
  }
}

module.exports = MockSocialService;
