const InstagramPublishStrategy = require('./publish.strategy');
const instagramGateway = require('../instagram.gateway');
const { MEDIA_EXTENSIONS } = require('../../../../utils/constants');

class StoryPublishStrategy extends InstagramPublishStrategy {
  async publish(igAccountId, accessToken, postData) {
    if (accessToken.startsWith('mock-')) {
      return { id: `ig_mock_story_${Date.now()}` };
    }

    const rawMediaUrl = postData.mediaUrl || (postData.mediaUrls && postData.mediaUrls[0]);
    const mediaUrl = this.resolveUrl(rawMediaUrl);
    const isVideo = MEDIA_EXTENSIONS.VIDEO.some(ext => mediaUrl.toLowerCase().endsWith(ext));

    const container = await instagramGateway.createStoryContainer(igAccountId, accessToken, mediaUrl, isVideo);
    if (isVideo) {
      await this.pollUntilReady(instagramGateway, container.id, accessToken);
    }
    return instagramGateway.publishContainer(igAccountId, accessToken, container.id);
  }
}

module.exports = StoryPublishStrategy;
