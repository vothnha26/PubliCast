const socialService = require('../../services/social/social.service');
const asyncHandler = require('../../utils/async-handler');

class SocialAnalyticsController {
  getMetrics = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const data = await socialService.getAggregatedMetrics(brandId);
    res.json({ message: 'Metrics fetched successfully', data });
  });
}

module.exports = new SocialAnalyticsController();
