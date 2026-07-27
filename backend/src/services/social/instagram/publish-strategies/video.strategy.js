const InstagramPublishStrategy = require('./publish.strategy');
const instagramGateway = require('../instagram.gateway');

class VideoPublishStrategy extends InstagramPublishStrategy {
  async publish(igAccountId, accessToken, postData) {
    if (accessToken.startsWith('mock-')) {
      return { id: `ig_mock_video_${Date.now()}` };
    }

    const rawMediaUrl = postData.mediaUrl || (postData.mediaUrls && postData.mediaUrls[0]);
    const mediaUrl = this.resolveUrl(rawMediaUrl);
    const { caption, scheduledAt } = postData;
    const container = await instagramGateway.createVideoContainer(igAccountId, accessToken, mediaUrl, caption, scheduledAt, postData.options);
    await this.pollUntilReady(instagramGateway, container.id, accessToken);
    return instagramGateway.publishContainer(igAccountId, accessToken, container.id);
  }
}

module.exports = VideoPublishStrategy;
