const LinkProcessorStrategy = require('./link-processor.strategy');

class TiktokProcessor extends LinkProcessorStrategy {
  process(linkItem) {
    const url = this.normalizeUrl(linkItem.url);
    return {
      ...linkItem,
      url,
      emoji: linkItem.emoji || '🎵',
      iconUrl: linkItem.iconUrl || 'tiktok'
    };
  }
}

module.exports = TiktokProcessor;
