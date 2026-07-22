const ReelPublishStrategy = require('./reel.strategy');
const StoryPublishStrategy = require('./story.strategy');
const VideoPublishStrategy = require('./video.strategy');
const PhotoPublishStrategy = require('./photo.strategy');
const AlbumPublishStrategy = require('./album.strategy');
const TextPublishStrategy = require('./text.strategy');
const { POST_TYPES, MEDIA_EXTENSIONS } = require('../../../../utils/constants');
const { matchesExtension } = require('../../../../utils/media-type.utils');

class FacebookPublishStrategyFactory {
  static getStrategy(type, mediaUrl) {
    if (type === POST_TYPES.REEL) {
      return new ReelPublishStrategy();
    }
    if (type === POST_TYPES.STORY) {
      return new StoryPublishStrategy();
    }
    if (type === POST_TYPES.CAROUSEL) {
      return new AlbumPublishStrategy();
    }
    if (mediaUrl) {
      // Strip any query string before matching the extension — a bare
      // endsWith() fails on signed CDN URLs like `clip.mp4?token=...` and
      // silently routes a video to the photo strategy (#65).
      const isVideo = matchesExtension(mediaUrl, MEDIA_EXTENSIONS.VIDEO);
      if (isVideo) {
        return new VideoPublishStrategy();
      } else {
        return new PhotoPublishStrategy();
      }
    }
    return new TextPublishStrategy();
  }
}

module.exports = FacebookPublishStrategyFactory;
