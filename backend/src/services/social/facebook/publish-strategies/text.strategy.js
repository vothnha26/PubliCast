const FacebookPublishStrategy = require('./publish.strategy');
const facebookGateway = require('../facebook.gateway');

class TextPublishStrategy extends FacebookPublishStrategy {
  async publish(pageId, pageAccessToken, postData) {
    const { caption, scheduledAt } = postData;
    return facebookGateway.publishTextPost(pageId, pageAccessToken, caption, scheduledAt);
  }
}

module.exports = TextPublishStrategy;
