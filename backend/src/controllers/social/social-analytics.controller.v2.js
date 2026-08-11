const socialService = require('../../services/social/social.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success, v2Error } = require('../../utils/response.helper');

/**
 * v2 envelope wrapper around SocialAnalyticsController — delegates to the
 * same socialService the v1 controller uses, only reshapes the response
 * (v1 already used a {message, data} shape here; this just routes it
 * through the shared v2Success helper instead of a hand-rolled res.json).
 */
class SocialAnalyticsControllerV2 {
  getMetrics = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    const data = await socialService.getAggregatedMetrics(brandId);
    v2Success(res, data, 'Metrics fetched successfully');
  });

  getMetricsVersion = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    const version = await socialService.getMetricsVersion(brandId);
    v2Success(res, { version }, 'Metrics version fetched successfully');
  });
}

module.exports = new SocialAnalyticsControllerV2();
