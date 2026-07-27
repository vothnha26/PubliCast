const FacebookPublishStrategy = require('./publish.strategy');
const facebookGateway = require('../facebook.gateway');

class StoryPublishStrategy extends FacebookPublishStrategy {
  async publish(pageId, pageAccessToken, postData) {
    const { mediaUrl, caption } = postData;
    if (!mediaUrl) {
      throw new Error('Story requires a media file (image or video)');
    }
    return facebookGateway.publishStory(pageId, pageAccessToken, mediaUrl, caption);
  }
}

module.exports = StoryPublishStrategy;
