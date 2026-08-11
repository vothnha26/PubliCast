const postingUsageMonitoringService = require('../../services/admin/posting-usage-monitoring.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success } = require('../../utils/response.helper');

class PostingUsageMonitoringControllerV2 {
  getMonthlyOverview = asyncHandler(async (req, res) => {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getUTCFullYear();
    const month = parseInt(req.query.month, 10) || now.getUTCMonth() + 1;

    const overview = await postingUsageMonitoringService.getMonthlyOverview(year, month);
    v2Success(res, overview, 'Monthly posting usage overview retrieved successfully');
  });
}

module.exports = new PostingUsageMonitoringControllerV2();
