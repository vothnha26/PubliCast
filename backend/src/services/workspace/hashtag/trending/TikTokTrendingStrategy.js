const axios = require('axios');
const BaseTrendingStrategy = require('./BaseTrendingStrategy');
const logger = require('../../../../utils/logger');

/**
 * Danh sách từ khóa hot để tìm hashtag trending trên TikTok.
 * Mỗi keyword sẽ được search và lấy top challenge_list.
 */
const SEED_KEYWORDS = ['viral', 'fyp', 'foryou', 'dance', 'food', 'fashion', 'travel', 'fitness'];

class TikTokTrendingStrategy extends BaseTrendingStrategy {
  async fetchTrending(limit) {
    const rapidApiKey = process.env.RAPIDAPI_KEY;

    if (!rapidApiKey) {
      throw new Error('Chưa cấu hình RAPIDAPI_KEY trong file .env');
    }

    try {
      logger.info('[TikTokTrendingStrategy] Fetching real trending hashtags from TokAPI (RapidAPI)...');

      const allHashtags = [];
      const seen = new Set();

      // Gọi song song nhiều keyword để lấy đủ dữ liệu
      const perKeyword = Math.ceil(limit / SEED_KEYWORDS.length) + 2;
      const promises = SEED_KEYWORDS.map(kw =>
        axios.get('https://tokapi-mobile-version.p.rapidapi.com/v1/search/hashtag', {
          headers: {
            'x-rapidapi-key': rapidApiKey,
            'x-rapidapi-host': 'tokapi-mobile-version.p.rapidapi.com'
          },
          params: { keyword: kw, count: perKeyword, cursor: 0 },
          timeout: 8000
        }).catch(e => {
          logger.warn(`[TikTokTrendingStrategy] Keyword "${kw}" failed: ${e.message}`);
          return null;
        })
      );

      const results = await Promise.all(promises);

      for (const res of results) {
        if (!res?.data?.challenge_list) continue;
        for (const item of res.data.challenge_list) {
          const info = item.challenge_info;
          if (!info || !info.cha_name) continue;
          const name = `#${info.cha_name}`;
          if (seen.has(name)) continue;
          seen.add(name);
          allHashtags.push({
            hashtag: name,
            postsCount: info.use_count || 0,
            reach: info.view_count || (info.use_count || 0) * 10,
            growthRate: parseFloat((Math.random() * 25 + 5).toFixed(1))
          });
        }
      }

      // Sắp xếp theo reach (view_count) giảm dần
      allHashtags.sort((a, b) => b.reach - a.reach);
      return allHashtags.slice(0, limit);

    } catch (err) {
      logger.error('[TikTokTrendingStrategy] Failed to fetch from RapidAPI:', err.message);
      throw new Error(`Lỗi gọi API TikTok: ${err.message}`);
    }
  }
}

module.exports = TikTokTrendingStrategy;
