const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');
const hashtagSyncService = require('../../services/workspace/hashtag/hashtag-sync.service');

// SOLID: Hằng số phản hồi tránh Magic Strings
const HASHTAG_ADMIN_RESPONSES = {
  MISSING_PLATFORM: 'Missing platform parameter',
  SYNC_SUCCESS: 'Trending hashtags synchronized successfully',
  SYNC_FAILED: 'Failed to synchronize trending hashtags',
  FETCH_SUCCESS: 'Hashtag snapshots retrieved successfully'
};

/**
 * Lấy danh sách toàn bộ snapshot trending hashtag từ DB
 * GET /api/admin/hashtags
 */
exports.getTrendingSnapshots = async (req, res, next) => {
  try {
    const snapshots = await prisma.hashtagTrendingSnapshot.findMany({
      orderBy: { snapshotDate: 'desc' }
    });

    return res.status(200).json({
      message: HASHTAG_ADMIN_RESPONSES.FETCH_SUCCESS,
      snapshots
    });
  } catch (error) {
    logger.error('Error in getTrendingSnapshots:', error);
    next(error);
  }
};

/**
 * Thực hiện đồng bộ tức thì trending hashtag từ API (RapidAPI) về DB & Redis Cache
 * POST /api/admin/hashtags/sync
 */
exports.syncTrendingHashtags = async (req, res, next) => {
  try {
    // Gọi phương thức đồng bộ của service
    await hashtagSyncService.syncTrendingHashtags();
    
    // Đọc lại snapshots vừa sync
    const snapshots = await prisma.hashtagTrendingSnapshot.findMany({
      orderBy: { snapshotDate: 'desc' }
    });

    return res.status(200).json({
      message: HASHTAG_ADMIN_RESPONSES.SYNC_SUCCESS,
      snapshots
    });
  } catch (error) {
    logger.error('Error in syncTrendingHashtags:', error);
    return res.status(500).json({
      message: HASHTAG_ADMIN_RESPONSES.SYNC_FAILED,
      error: error.message
    });
  }
};
