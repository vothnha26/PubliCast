const FacebookPublishStrategy = require('./publish.strategy');
const facebookGateway = require('../facebook.gateway');

class PhotoPublishStrategy extends FacebookPublishStrategy {
  async publish(pageId, pageAccessToken, postData) {
    const { mediaUrl, caption, scheduledAt, altText, options } = postData;
    const mediaAltText = options?.mediaCaptions?.[0] || altText;
    const finalCaption = caption || mediaAltText || '';
    return facebookGateway.publishPhoto(pageId, pageAccessToken, mediaUrl, finalCaption, scheduledAt);
  }
}

module.exports = PhotoPublishStrategy;
