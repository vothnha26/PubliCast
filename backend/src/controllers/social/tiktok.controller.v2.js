const tiktokService = require('../../services/social/tiktok');
const asyncHandler = require('../../utils/async-handler');
const { sendSuccess } = require('../../utils/response.util');

class TikTokControllerV2 {
  getTikTokPublishedVideos = asyncHandler(async (req, res) => {
    const { brandId, pageToken, limit } = req.query;
    if (!brandId) {
      return res.status(400).json({ message: 'brandId is required' });
    }
    const data = await tiktokService.getPublishedVideos(brandId, pageToken, limit);
    sendSuccess(res, data);
  });
}

module.exports = new TikTokControllerV2();
