const postingUsageMonitoringService = require('../../services/admin/posting-usage-monitoring.service');
const asyncHandler = require('../../utils/async-handler');

class PostingUsageMonitoringController {
  /**
   * GET /api/admin/posting-usage/monthly?year=2026&month=8
   */
  getMonthlyOverview = asyncHandler(async (req, res) => {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getUTCFullYear();
    const month = parseInt(req.query.month, 10) || now.getUTCMonth() + 1;

    const overview = await postingUsageMonitoringService.getMonthlyOverview(year, month);
    res.status(200).json({
      message: 'Monthly posting usage overview retrieved successfully',
      data: overview
    });
  });
}

module.exports = new PostingUsageMonitoringController();
