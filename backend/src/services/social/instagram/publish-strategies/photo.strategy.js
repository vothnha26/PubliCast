const InstagramPublishStrategy = require('./publish.strategy');
const instagramGateway = require('../instagram.gateway');

class PhotoPublishStrategy extends InstagramPublishStrategy {
  async publish(igAccountId, accessToken, postData) {
    if (accessToken.startsWith('mock-')) {
      return { id: `ig_mock_photo_${Date.now()}` };
    }

    const rawMediaUrl = postData.mediaUrl || (postData.mediaUrls && postData.mediaUrls[0]);
    const mediaUrl = this.resolveUrl(rawMediaUrl);
    const { caption, scheduledAt, altText } = postData;
    const container = await instagramGateway.createImageContainer(igAccountId, accessToken, mediaUrl, caption, scheduledAt, postData.options, altText);
    return instagramGateway.publishContainer(igAccountId, accessToken, container.id);
  }
}

module.exports = PhotoPublishStrategy;
