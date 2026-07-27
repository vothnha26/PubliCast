const tiktokService = require('../../services/social/tiktok');
const asyncHandler = require('../../utils/async-handler');

class TikTokController {
  getTikTokPublishedVideos = asyncHandler(async (req, res) => {
    const { brandId, pageToken, limit } = req.query;
    if (!brandId) {
      return res.status(400).json({ message: 'brandId is required' });
    }
    const data = await tiktokService.getPublishedVideos(brandId, pageToken, limit);
    res.json(data);
  });
}

module.exports = new TikTokController();
