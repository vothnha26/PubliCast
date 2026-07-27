const YoutubeProcessor = require('./youtube.processor');
const FacebookProcessor = require('./facebook.processor');
const TiktokProcessor = require('./tiktok.processor');
const DefaultProcessor = require('./default.processor');

class LinkProcessorFactory {
  constructor() {
    this.youtubeProcessor = new YoutubeProcessor();
    this.facebookProcessor = new FacebookProcessor();
    this.tiktokProcessor = new TiktokProcessor();
    this.defaultProcessor = new DefaultProcessor();
  }

  /**
   * Resolve processor strategy based on URL domain.
   * @param {string} url - The link URL.
   * @returns {LinkProcessorStrategy}
   */
  getProcessor(url) {
    if (!url || typeof url !== 'string') {
      return this.defaultProcessor;
    }
    
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
      return this.youtubeProcessor;
    }
    if (lowerUrl.includes('facebook.com')) {
      return this.facebookProcessor;
    }
    if (lowerUrl.includes('tiktok.com')) {
      return this.tiktokProcessor;
    }
    
    return this.defaultProcessor;
  }
}

module.exports = new LinkProcessorFactory();
