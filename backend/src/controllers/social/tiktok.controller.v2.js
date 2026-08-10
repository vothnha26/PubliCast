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
}

module.exports = new TikTokControllerV2();
