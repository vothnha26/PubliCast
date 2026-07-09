const InstagramTrendingStrategy = require('./InstagramTrendingStrategy');
const TikTokTrendingStrategy = require('./TikTokTrendingStrategy');
const MockTrendingStrategy = require('./MockTrendingStrategy');

class TrendingHashtagService {
  constructor() {
    this.strategies = {
      INSTAGRAM: new InstagramTrendingStrategy(),
      TIKTOK: new TikTokTrendingStrategy(),
      MOCK: new MockTrendingStrategy()
    };
  }

  /**
   * Lấy trending hashtags theo platform
   * @param {string} platform - INSTAGRAM | TIKTOK
   * @param {number} limit - số lượng hashtag tối đa
   */
  async getTrendingHashtags(platform, limit = 20) {
    const platformKey = (platform || 'MOCK').toUpperCase();
    const strategy = this.strategies[platformKey] || this.strategies.MOCK;
    return await strategy.fetchTrending(limit);
  }
}

module.exports = new TrendingHashtagService();
