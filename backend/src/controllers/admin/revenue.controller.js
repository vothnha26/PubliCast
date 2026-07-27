const revenueService = require('../../services/admin/revenue.service');
const asyncHandler = require('../../utils/async-handler');

class RevenueController {
  getRevenueDashboard = asyncHandler(async (req, res) => {
    const data = await revenueService.getDashboardData();
    res.status(200).json({
      message: 'Revenue dashboard data retrieved successfully',
      data
    });
  });
}

module.exports = new RevenueController();
