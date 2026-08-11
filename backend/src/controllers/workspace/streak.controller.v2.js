const streakService = require('../../services/workspace/streak.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success, v2Error } = require('../../utils/response.helper');

exports.getStreak = asyncHandler(async (req, res) => {
  const { brandId } = req.query;
  if (!brandId) {
    return v2Error(res, 'Missing required fields: brandId', 400);
  }

  const streak = await streakService.getStreak(brandId);

  v2Success(res, {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    lastPostedDate: streak.lastPostedDate
  }, 'Streak retrieved successfully');
});
