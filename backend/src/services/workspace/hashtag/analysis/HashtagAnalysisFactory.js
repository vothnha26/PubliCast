const { PLATFORMS } = require('./constants');
const InstagramAnalysisStrategy = require('./InstagramAnalysisStrategy');
const TikTokAnalysisStrategy = require('./TikTokAnalysisStrategy');
const MockAnalysisStrategy = require('./MockAnalysisStrategy');
const logger = require('../../../../utils/logger');

class HashtagAnalysisFactory {
  constructor() {
    this.strategies = {};
  }

  /**
   * Lấy strategy phân tích phù hợp dựa trên platform và sự hiện diện của RAPIDAPI_KEY.
   * @param {string} platform 
   * @returns {HashtagAnalysisStrategy}
   */
  getStrategy(platform) {
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    const formattedPlatform = (platform || '').toUpperCase();

    // Nếu không cấu hình RAPIDAPI_KEY, tự động dùng MockStrategy
    if (!rapidApiKey) {
      logger.info(`[HashtagAnalysisFactory] RAPIDAPI_KEY is missing. Using MockAnalysisStrategy for platform ${formattedPlatform}.`);
      return new MockAnalysisStrategy();
    }

    switch (formattedPlatform) {
      case PLATFORMS.INSTAGRAM:
        return new InstagramAnalysisStrategy();
      case PLATFORMS.TIKTOK:
        return new TikTokAnalysisStrategy();
      default:
        logger.warn(`[HashtagAnalysisFactory] Unsupported platform: ${platform}. Falling back to MockAnalysisStrategy.`);
        return new MockAnalysisStrategy();
    }
  }
}

module.exports = new HashtagAnalysisFactory();
