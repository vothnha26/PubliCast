const LinkProcessorStrategy = require('./link-processor.strategy');

class DefaultProcessor extends LinkProcessorStrategy {
  process(linkItem) {
    const url = this.normalizeUrl(linkItem.url);
    return {
      ...linkItem,
      url,
      emoji: linkItem.emoji || '🔗',
      iconUrl: linkItem.iconUrl || 'link'
    };
  }
}

module.exports = DefaultProcessor;
