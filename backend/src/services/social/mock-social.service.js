const BaseSocialService = require('./base-social.service');

class MockSocialService extends BaseSocialService {
  constructor(platformName) {
    super();
    this.platformName = platformName || 'MockPlatform';
  }

  async publishPost(brandId, postData) {
    console.log('\n==================================================');
    console.log(`🚀 [SocialPublish/Sandbox] NEW OUTGOING POST DETECTED`);
    console.log(`Platform:    ${this.platformName}`);
    console.log(`Brand ID:    ${brandId}`);
    console.log(`Title:       ${postData.title || '(No Title)'}`);
    console.log(`Type:        ${postData.type || 'TEXT'}`);
    console.log(`Media URLs:  ${postData.mediaUrls ? postData.mediaUrls.join(', ') : 'None'}`);
    console.log('--------------------------------------------------');
    console.log(`Caption:\n${postData.caption}`);
    console.log('==================================================\n');

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
    console.log(`[SocialPublish/Sandbox] Deleted post ${platformPostId} from brand ${brandId} on ${this.platformName}`);
    return { success: true, message: 'Deleted mock post successfully.' };
  }
}

module.exports = MockSocialService;
