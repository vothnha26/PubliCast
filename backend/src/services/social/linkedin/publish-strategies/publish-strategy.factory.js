const TextPublishStrategy = require('./text.strategy');
const ImagePublishStrategy = require('./image.strategy');
const VideoPublishStrategy = require('./video.strategy');
const { MEDIA_EXTENSIONS } = require('../../../../utils/constants');
const { matchesExtension } = require('../../../../utils/media-type.utils');

class LinkedInPublishStrategyFactory {
  static getStrategy(mediaUrl) {
    if (mediaUrl) {
      // Strip any query string before matching the extension (#65).
      const isVideo = matchesExtension(mediaUrl, MEDIA_EXTENSIONS.VIDEO);
      if (isVideo) {
        return new VideoPublishStrategy();
      } else {
        return new ImagePublishStrategy();
      }
    }
    return new TextPublishStrategy();
  }
}

module.exports = LinkedInPublishStrategyFactory;
