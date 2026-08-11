const tiktokService = require('../../services/social/tiktok');
const asyncHandler = require('../../utils/async-handler');
const { v2Success: sendSuccess } = require('../../utils/response.helper');

class TikTokControllerV2 {
  getTikTokPublishedVideos = asyncHandler(async (req, res) => {
    const { brandId, pageToken, limit, socialAccountId, startDate, endDate } = req.query;
    if (!brandId) {
      return res.status(400).json({ message: 'brandId is required' });
    }
    const data = await tiktokService.getPublishedVideos(brandId, pageToken, limit, socialAccountId || null, startDate || null, endDate || null);
    sendSuccess(res, data);
  });

  getTikTokComments = asyncHandler(async (req, res) => {
    const { brandId, videoId, commentId, maxCount, cursor, socialAccountId } = req.query;
    if (!brandId) {
      return res.status(400).json({ message: 'brandId is required' });
    }
    if (!videoId && !commentId) {
      return res.status(400).json({ message: 'Either videoId or commentId is required' });
    }

    const data = await tiktokService.getVideoComments(brandId, {
      videoId,
      commentId,
      maxCount: maxCount ? parseInt(maxCount) : 10,
      cursor: cursor ? parseInt(cursor) : 0,
      socialAccountId
    });
    sendSuccess(res, data);
  });
}

module.exports = new TikTokControllerV2();
