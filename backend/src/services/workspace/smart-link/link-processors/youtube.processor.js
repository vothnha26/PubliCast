const LinkProcessorStrategy = require('./link-processor.strategy');

class YoutubeProcessor extends LinkProcessorStrategy {
  process(linkItem) {
    const url = this.normalizeUrl(linkItem.url);
    return {
      ...linkItem,
      url,
      emoji: linkItem.emoji || '📺',
      iconUrl: linkItem.iconUrl || 'youtube'
    };
  }
}

module.exports = YoutubeProcessor;
