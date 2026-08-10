const postingUsageService = require('../../services/workspace/posting-usage.service');
const asyncHandler = require('../../utils/async-handler');

class PostingUsageController {
  /**
   * GET /api/workspace/posting-usage?brandId=...
   */
  getDailyUsage = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const usage = await postingUsageService.getDailyUsageForBrand(brandId);
    res.status(200).json({
      message: 'Daily posting usage retrieved successfully',
      data: usage
    });
  });
}

module.exports = new PostingUsageController();
