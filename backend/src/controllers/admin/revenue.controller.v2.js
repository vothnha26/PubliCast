const revenueService = require('../../services/admin/revenue.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success } = require('../../utils/response.helper');

class RevenueControllerV2 {
  getRevenueDashboard = asyncHandler(async (req, res) => {
    const data = await revenueService.getDashboardData();
    v2Success(res, data, 'Revenue dashboard data retrieved successfully');
  });
}

module.exports = new RevenueControllerV2();
