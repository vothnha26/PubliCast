const streakService = require('../../services/workspace/streak.service');
const logger = require('../../utils/logger');

/**
 * GET /api/v2/content-extras/streak
 */
exports.getStreak = async (req, res, next) => {
  try {
    const { brandId } = req.query;
    if (!brandId) {
      return res.status(400).json({ message: 'Missing required fields: brandId' });
    }

    const streak = await streakService.getStreak(brandId);

    return res.status(200).json({
      message: 'Streak retrieved successfully',
      data: {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        lastPostedDate: streak.lastPostedDate
      }
    });
  } catch (error) {
    logger.error('Error in getStreak:', error);
    next(error);
  }
};
