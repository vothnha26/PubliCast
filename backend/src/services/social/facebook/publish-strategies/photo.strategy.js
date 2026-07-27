const FacebookPublishStrategy = require('./publish.strategy');
const facebookGateway = require('../facebook.gateway');

class PhotoPublishStrategy extends FacebookPublishStrategy {
  async publish(pageId, pageAccessToken, postData) {
    const { mediaUrl, caption, scheduledAt } = postData;
    return facebookGateway.publishPhoto(pageId, pageAccessToken, mediaUrl, caption, scheduledAt);
  }
}

module.exports = PhotoPublishStrategy;
