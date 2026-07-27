const FacebookPublishStrategy = require('./publish.strategy');
const facebookGateway = require('../facebook.gateway');

class VideoPublishStrategy extends FacebookPublishStrategy {
  async publish(pageId, pageAccessToken, postData) {
    const { mediaUrl, title, caption, scheduledAt } = postData;
    return facebookGateway.publishVideo(pageId, pageAccessToken, mediaUrl, title || caption || 'New Video', caption, scheduledAt);
  }
}

module.exports = VideoPublishStrategy;
