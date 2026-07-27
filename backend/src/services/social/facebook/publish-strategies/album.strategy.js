const FacebookPublishStrategy = require('./publish.strategy');
const facebookGateway = require('../facebook.gateway');

class AlbumPublishStrategy extends FacebookPublishStrategy {
  async publish(pageId, pageAccessToken, postData) {
    const { mediaUrls = [], caption, scheduledAt } = postData;
    const mediaCaptions = postData.mediaCaptions || postData.options?.mediaCaptions || [];
    
    console.log('[AlbumPublishStrategy] Publishing album with:', {
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
