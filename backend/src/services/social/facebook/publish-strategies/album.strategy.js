const FacebookPublishStrategy = require('./publish.strategy');
const facebookGateway = require('../facebook.gateway');
const logger = require('../../../../utils/logger');

class AlbumPublishStrategy extends FacebookPublishStrategy {
  async publish(pageId, pageAccessToken, postData) {
    const { mediaUrls = [], caption, scheduledAt, altText } = postData;
    const rawMediaCaptions = postData.mediaCaptions || postData.options?.mediaCaptions || [];
    const mediaCaptions = [...rawMediaCaptions];
    if (altText && (!mediaCaptions[0] || !mediaCaptions[0].trim())) {
      mediaCaptions[0] = altText;
    }
    
    logger.debug('[AlbumPublishStrategy] Publishing album with:', {
      pageId,
      mediaUrlsCount: mediaUrls.length,
      caption,
      mediaCaptionsCount: mediaCaptions.length,
      mediaCaptions,
      scheduledAt
    });

    if (!Array.isArray(mediaUrls) || mediaUrls.length < 2) {
      throw new Error('Facebook album requires at least 2 images');
    }
    return facebookGateway.publishAlbum(pageId, pageAccessToken, mediaUrls, caption, mediaCaptions, scheduledAt);
  }
}

module.exports = AlbumPublishStrategy;
