const postingUsageService = require('../../services/workspace/posting-usage.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success, v2Error } = require('../../utils/response.helper');

/**
 * v2 envelope wrapper around PostingUsageController — delegates to the same
 * postingUsageService the v1 controller uses. v1 already used the
 * {message, data} shape here; this just routes it through the shared
 * v2Success helper instead of a hand-rolled res.json().
 */
class PostingUsageControllerV2 {
  getDailyUsage = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    const usage = await postingUsageService.getDailyUsageForBrand(brandId);
    v2Success(res, usage, 'Daily posting usage retrieved successfully');
  });
}

module.exports = new PostingUsageControllerV2();
