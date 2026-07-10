const prisma = require('../../../config/prisma');
const logger = require('../../../utils/logger');
const redisClient = require('../../../config/redis');
const trendingHashtagService = require('./trending/TrendingHashtagService');

const TRENDING_CACHE_TTL_SECONDS = 24 * 60 * 60;

/**
 * Service đồng bộ dữ liệu Trending Hashtag tự động (chạy ngầm theo lịch trình)
 * Nhằm kiểm soát quota tuyệt đối (chỉ gọi API RapidAPI một lần mỗi ngày).
 */
class HashtagSyncService {
  async syncTrendingHashtags() {
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    if (!rapidApiKey) {
      logger.warn('[HashtagSync] RAPIDAPI_KEY is not configured. Skipping daily trending sync.');
      return;
    }

    logger.info('[HashtagSync] Starting scheduled trending hashtags sync...');

    const today = new Date();
    today.setHours(0, 0, 0, 0); // chỉ lấy ngày

    // Đồng bộ cả TIKTOK và INSTAGRAM để tạo snapshot và phân chia dữ liệu riêng biệt
    const platformsToSync = ['TIKTOK', 'INSTAGRAM'];

    for (const platform of platformsToSync) {
      try {
        logger.info(`[HashtagSync] Fetching trends for platform: ${platform} from RapidAPI...`);
        
        // Gọi API lấy tối đa 30 items
        const trendingData = await trendingHashtagService.getTrendingHashtags(platform, 30);

        if (trendingData && trendingData.length > 0) {
          const dataJson = JSON.stringify(trendingData);

          // 1. Lưu hoặc cập nhật snapshot trong DB
          const uuid = require('crypto').randomUUID();
          await prisma.$executeRawUnsafe(
            'INSERT INTO hashtag_trending_snapshots (id, platform, snapshotDate, dataJson, fetchedAt) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE dataJson = ?, fetchedAt = ?',
            uuid,
            platform,
            today,
            dataJson,
            new Date(),
            dataJson,
            new Date()
          );
          logger.info(`[HashtagSync] DB snapshot saved for platform: ${platform}`);

          // 2. Cập nhật cache Redis tương ứng với platform đang sync
          const cacheKeys = platform === 'TIKTOK'
            ? ['hashtag:trending:TIKTOK', 'hashtag:trending:MOCK']
            : ['hashtag:trending:INSTAGRAM'];

          for (const key of cacheKeys) {
            await redisClient.setEx(key, TRENDING_CACHE_TTL_SECONDS, dataJson);
          }
          logger.info(`[HashtagSync] Redis cache updated for platform key(s): ${cacheKeys.join(', ')}`);
        }
      } catch (err) {
        logger.error(`[HashtagSync] Failed to sync platform ${platform}:`, err.message);
      }
    }

    logger.info('[HashtagSync] Scheduled trending hashtags sync finished.');
  }
}

module.exports = new HashtagSyncService();
