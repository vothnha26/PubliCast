const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');
const trendingHashtagService = require('../../services/workspace/hashtag/trending/TrendingHashtagService');
const redisClient = require('../../config/redis');
const hashtagAnalysisFactory = require('../../services/workspace/hashtag/analysis/HashtagAnalysisFactory');

// Cache 24 giờ → ~90 API calls/tháng → vừa đủ Free tier RapidAPI
const TRENDING_CACHE_TTL_SECONDS = 24 * 60 * 60;

// Trả về cache key tương ứng cho từng platform được hỗ trợ
const getPlatformCacheKey = (platform) => {
  const SUPPORTED_PLATFORMS = {
    INSTAGRAM: 'INSTAGRAM',
    TIKTOK: 'TIKTOK'
  };
  const source = SUPPORTED_PLATFORMS[platform.toUpperCase()] || SUPPORTED_PLATFORMS.TIKTOK;
  return `hashtag:trending:${source}`;
};

/**
 * Get all hashtag sets and tracked hashtags for a brand
 */
exports.getHashtagData = async (req, res, next) => {
  try {
    const { brandId } = req.query;
    if (!brandId) {
      return res.status(400).json({ message: 'Missing brandId parameter' });
    }

    // Fetch sets
    const sets = await prisma.hashtagSet.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch tracked tags
    const trackers = await prisma.hashtagTracker.findMany({
      where: { brandId },
      orderBy: { addedAt: 'desc' }
    });

    return res.status(200).json({ sets, trackers });
  } catch (error) {
    logger.error('Error in getHashtagData:', error);
    next(error);
  }
};

/**
 * Create a new hashtag set
 */
exports.createHashtagSet = async (req, res, next) => {
  try {
    const { brandId, name, hashtags, targetPlatforms } = req.body;
    
    if (!brandId || !name || !hashtags) {
      return res.status(400).json({ message: 'Missing required fields: brandId, name, or hashtags' });
    }

    const newSet = await prisma.hashtagSet.create({
      data: {
        brandId,
        name,
        hashtags: Array.isArray(hashtags) ? hashtags.join(',') : hashtags,
        targetPlatforms: Array.isArray(targetPlatforms) ? targetPlatforms.join(',') : (targetPlatforms || 'IG,TK')
      }
    });

    return res.status(201).json({ message: 'Hashtag set created successfully', data: newSet });
  } catch (error) {
    logger.error('Error in createHashtagSet:', error);
    next(error);
  }
};

/**
 * Update an existing hashtag set
 */
exports.updateHashtagSet = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, hashtags, targetPlatforms } = req.body;

    const existingSet = await prisma.hashtagSet.findUnique({ where: { id } });
    if (!existingSet) {
      return res.status(404).json({ message: 'Hashtag set not found' });
    }

    const updatedSet = await prisma.hashtagSet.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingSet?.name,
        hashtags: hashtags !== undefined 
          ? (Array.isArray(hashtags) ? hashtags.join(',') : hashtags) 
          : existingSet?.hashtags,
        targetPlatforms: targetPlatforms !== undefined 
          ? (Array.isArray(targetPlatforms) ? targetPlatforms.join(',') : targetPlatforms) 
          : existingSet?.targetPlatforms
      }
    });

    return res.status(200).json({ message: 'Hashtag set updated successfully', data: updatedSet });
  } catch (error) {
    logger.error('Error in updateHashtagSet:', error);
    next(error);
  }
};

/**
 * Delete a hashtag set
 */
exports.deleteHashtagSet = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingSet = await prisma.hashtagSet.findUnique({ where: { id } });
    if (!existingSet) {
      return res.status(404).json({ message: 'Hashtag set not found' });
    }

    await prisma.hashtagSet.delete({ where: { id } });

    return res.status(200).json({ message: 'Hashtag set deleted successfully' });
  } catch (error) {
    logger.error('Error in deleteHashtagSet:', error);
    next(error);
  }
};

/**
 * Track a new hashtag (Hashtag Tracker)
 */
exports.trackHashtag = async (req, res, next) => {
  try {
    const { brandId, hashtag, platform } = req.body;

    if (!brandId || !hashtag || !platform) {
      return res.status(400).json({ message: 'Missing required fields: brandId, hashtag, platform' });
    }

    // Clean up hashtag input
    const cleanTag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;

    // Check if already tracking
    const existing = await prisma.hashtagTracker.findUnique({
      where: {
        brandId_platform_hashtag: {
          brandId,
          platform,
          hashtag: cleanTag
        }
      }
    });

    if (existing) {
      return res.status(409).json({ message: 'Hashtag is already being tracked on this platform' });
    }

    // Create a new tracker with randomized/mock initial analytics
    const newTracker = await prisma.hashtagTracker.create({
      data: {
        brandId,
        hashtag: cleanTag,
        platform,
        totalPosts: Math.floor(Math.random() * 500000 + 10000),
        postsLast24h: Math.floor(Math.random() * 1200 + 50),
        totalReach: Math.floor(Math.random() * 80000 + 2000),
        avgEngagementRate: parseFloat((Math.random() * 8 + 1).toFixed(2)),
        trendDirection: 'UP',
        addedAt: new Date(),
        lastFetchedAt: new Date()
      }
    });

    return res.status(201).json({ message: 'Hashtag added to tracking successfully', data: newTracker });
  } catch (error) {
    logger.error('Error in trackHashtag:', error);
    next(error);
  }
};

/**
 * Stop tracking a hashtag
 */
exports.untrackHashtag = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.hashtagTracker.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Tracked hashtag not found' });
    }

    await prisma.hashtagTracker.delete({ where: { id } });

    return res.status(200).json({ message: 'Stopped tracking hashtag successfully' });
  } catch (error) {
    logger.error('Error in untrackHashtag:', error);
    next(error);
  }
};

/**
 * Get trending hashtags by platform
 * GET /api/hashtags/trending
 */
exports.getTrendingHashtags = async (req, res, next) => {
  try {
    const { platform = 'MOCK', limit = 20 } = req.query;
    const parsedLimit = parseInt(limit, 10);
    const cacheKey = getPlatformCacheKey(platform);

    // 1. Thử lấy từ Redis cache trước
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.info(`[TrendingCache] HIT → ${cacheKey}`);
        const allCached = JSON.parse(cached);
        return res.status(200).json({ trending: allCached.slice(0, parsedLimit), fromCache: true });
      }
    } catch (cacheErr) {
      logger.warn(`[TrendingCache] Redis read failed, bypassing cache: ${cacheErr.message}`);
    }

    // 2. Cache miss → Thử lấy từ DB snapshot mới nhất đã lưu
    const SUPPORTED_PLATFORMS = {
      INSTAGRAM: 'INSTAGRAM',
      TIKTOK: 'TIKTOK'
    };
    const normalizedPlatform = SUPPORTED_PLATFORMS[platform.toUpperCase()] || SUPPORTED_PLATFORMS.TIKTOK;

    let trending = [];
    let fromDb = false;

    try {
      // Sử dụng raw query để lấy snapshot mới nhất của platform
      const records = await prisma.$queryRawUnsafe(
        'SELECT dataJson FROM hashtag_trending_snapshots WHERE platform = ? ORDER BY snapshotDate DESC LIMIT 1',
        normalizedPlatform
      );

      if (records && records.length > 0) {
        logger.info(`[TrendingDB] HIT → platform: ${normalizedPlatform}, snapshot found`);
        trending = JSON.parse(records[0].dataJson);
        fromDb = true;

        // Lưu ngược lại vào Redis cache (TTL: 24h) để các request sau cực nhanh
        try {
          await redisClient.setEx(cacheKey, TRENDING_CACHE_TTL_SECONDS, JSON.stringify(trending));
          logger.info(`[TrendingCache] Cached to Redis → ${cacheKey}`);
        } catch (cacheErr) {
          logger.warn(`[TrendingCache] Redis write failed: ${cacheErr.message}`);
        }
      }
    } catch (dbErr) {
      logger.warn(`[TrendingDB] DB read failed: ${dbErr.message}`);
    }

    // Nếu cả cache và DB đều trống, kích hoạt đồng bộ chạy ngầm
    if (trending.length === 0) {
      logger.warn(`[TrendingAPI] Cache and DB MISS for platform ${platform}. Triggering background sync...`);
      const hashtagSyncService = require('../../services/workspace/hashtag/hashtag-sync.service');
      hashtagSyncService.syncTrendingHashtags().catch(err => {
        logger.error('[TrendingAPI] Background sync failed:', err.message);
      });
    }

    return res.status(200).json({ 
      trending: trending.slice(0, parsedLimit), 
      fromCache: false, 
      fromDb 
    });
  } catch (error) {
    logger.error('Error in getTrendingHashtags:', error);
    next(error);
  }
};

/**
 * Get detailed analytics for a tracked hashtag
 * GET /api/hashtags/analysis/:id
 */
exports.getHashtagAnalysis = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Tìm tracker trong db
    const tracker = await prisma.hashtagTracker.findUnique({
      where: { id }
    });

    if (!tracker) {
      return res.status(404).json({ message: 'Tracked hashtag not found' });
    }

    // Kiểm tra xem đã có dữ liệu phân tích trong DB chưa.
    // Nếu chưa có (hoặc trống), tiến hành lấy dữ liệu mới và cập nhật vào DB
    let analysisData;
    if (!tracker.trendScoreJson || !tracker.topPostsJson) {
      const strategy = hashtagAnalysisFactory.getStrategy(tracker.platform);
      
      try {
        logger.info(`[HashtagAnalysis] Executing strategy ${strategy.constructor.name} for #${tracker.hashtag}...`);
        analysisData = await strategy.analyze(tracker.hashtag, tracker);
      } catch (err) {
        // Tự động fallback sang Mock Strategy khi có lỗi API Scraper
        logger.error(`[HashtagAnalysis] Strategy ${strategy.constructor.name} failed: ${err.message}. Falling back to MockAnalysisStrategy.`);
        const MockAnalysisStrategy = require('../../services/workspace/hashtag/analysis/MockAnalysisStrategy');
        const fallbackStrategy = new MockAnalysisStrategy();
        analysisData = await fallbackStrategy.analyze(tracker.hashtag, tracker);
      }

      // Tách dữ liệu ra để lưu vào DB
      const trendScoreObj = {
        summary: analysisData.summary,
        evolution: analysisData.evolution,
        distributions: analysisData.distributions,
        countries: analysisData.countries,
        usedTags: analysisData.usedTags,
        topPictures: analysisData.topPictures
      };

      const topPostsObj = {
        topParticipants: analysisData.topParticipants,
        topPosts: analysisData.topPosts
      };

      await prisma.hashtagTracker.update({
        where: { id },
        data: {
          trendScoreJson: JSON.stringify(trendScoreObj),
          topPostsJson: JSON.stringify(topPostsObj),
          lastFetchedAt: new Date()
        }
      });

      logger.info(`[HashtagAnalysis] Saved analytics data for tracker: ${tracker.hashtag}`);
    } else {
      // Đã có dữ liệu, parse từ DB
      const trendScoreObj = JSON.parse(tracker.trendScoreJson);
      const topPostsObj = JSON.parse(tracker.topPostsJson);

      analysisData = {
        summary: trendScoreObj.summary,
        evolution: trendScoreObj.evolution,
        distributions: trendScoreObj.distributions,
        countries: trendScoreObj.countries,
        usedTags: trendScoreObj.usedTags,
        topPictures: trendScoreObj.topPictures,
        topParticipants: topPostsObj.topParticipants,
        topPosts: topPostsObj.topPosts
      };
    }

    return res.status(200).json({
      id: tracker.id,
      hashtag: tracker.hashtag,
      platform: tracker.platform,
      totalPosts: tracker.totalPosts,
      totalReach: tracker.totalReach,
      postsLast24h: tracker.postsLast24h,
      avgEngagementRate: tracker.avgEngagementRate,
      trendDirection: tracker.trendDirection,
      ...analysisData
    });
  } catch (error) {
    logger.error('Error in getHashtagAnalysis:', error);
    next(error);
  }
};
