const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');
const trendingHashtagService = require('../../services/workspace/hashtag/trending/TrendingHashtagService');

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

    const authorizationFacade = require('../../services/auth/authorization.facade');
    const hasAccess = await authorizationFacade.checkBrandAccess(req.user.id, existingSet.brandId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập vào tài nguyên này.' });
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

    const authorizationFacade = require('../../services/auth/authorization.facade');
    const hasAccess = await authorizationFacade.checkBrandAccess(req.user.id, existingSet.brandId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập vào tài nguyên này.' });
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

    const authorizationFacade = require('../../services/auth/authorization.facade');
    const hasAccess = await authorizationFacade.checkBrandAccess(req.user.id, existing.brandId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập vào tài nguyên này.' });
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
    const trending = await trendingHashtagService.getTrendingHashtags(platform, parseInt(limit, 10));
    return res.status(200).json({ trending });
  } catch (error) {
    logger.error('Error in getTrendingHashtags:', error);
    next(error);
  }
};
