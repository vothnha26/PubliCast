const socialAccountRepository = require('../../../repositories/social/social-account.repository');
const { PLATFORMS } = require('../../../utils/constants');
const LinkedInPublishStrategyFactory = require('./publish-strategies/publish-strategy.factory');

class LinkedInPostService {
  async publishPost(brandId, postData) {
    const { memberId, accessToken } = await this._getAccountCredentials(brandId);

    if (accessToken && (accessToken.startsWith('mock-') || accessToken.includes('mock') || accessToken.startsWith('li_mock'))) {
      console.log(`[LinkedIn] Mock publishing detected for mock token. Returning simulated success.`);
      return { platformVideoId: `mock-linkedin-post-${Date.now()}`, publishedAt: new Date() };
    }

    const { mediaUrls, caption, title } = postData;
    const mediaUrl = mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : null;

    const strategy = LinkedInPublishStrategyFactory.getStrategy(mediaUrl);
    const result = await strategy.publish(memberId, accessToken, { caption, mediaUrl, title });

    return { platformVideoId: result.id, publishedAt: new Date() };
  }

  // ============= Private Helper Methods =============

  async _getAccountCredentials(brandId) {
    const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.LINKEDIN);
    if (!socialAccount || socialAccount.length === 0) {
      throw new Error('LinkedIn account not connected for this brand');
    }
    return {
      memberId: socialAccount[0].platformAccountId,
      accessToken: socialAccount[0].accessToken
    };
  }
}

module.exports = new LinkedInPostService();
