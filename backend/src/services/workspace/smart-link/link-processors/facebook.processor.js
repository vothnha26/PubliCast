const LinkProcessorStrategy = require('./link-processor.strategy');

class FacebookProcessor extends LinkProcessorStrategy {
  process(linkItem) {
    const url = this.normalizeUrl(linkItem.url);
    return {
      ...linkItem,
      url,
      emoji: linkItem.emoji || '📘',
      iconUrl: linkItem.iconUrl || 'facebook'
    };
  }
}

module.exports = FacebookProcessor;
