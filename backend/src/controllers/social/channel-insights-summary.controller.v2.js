const { v2Success, v2Error } = require('../../utils/response.helper');
const channelInsightsSummaryService = require('../../services/social/channel-insights-summary.service');
const asyncHandler = require('../../utils/async-handler');

class ChannelInsightsSummaryControllerV2 {
  getSummary = asyncHandler(async (req, res) => {
    const { brandId, socialAccountId, pageToken, limit, startDate, endDate } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    const summary = await channelInsightsSummaryService.getSummary(
      brandId,
      socialAccountId || null,
      req.user.id,
      {
        pageToken: pageToken || null,
        limit: limit ? parseInt(limit, 10) : 10,
        startDate: startDate || null,
        endDate: endDate || null
      }
    );

    v2Success(res, summary, 'Channel insights summary retrieved successfully');
  });
}

module.exports = new ChannelInsightsSummaryControllerV2();
