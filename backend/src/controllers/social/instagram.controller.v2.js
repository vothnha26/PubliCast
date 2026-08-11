const instagramService = require('../../services/social/instagram');
const asyncHandler = require('../../utils/async-handler');
const { v2Success, v2Error } = require('../../utils/response.helper');

/**
 * v2 envelope wrapper around InstagramController — delegates to the same
 * instagramService the v1 controller uses, only reshapes the response.
 */
class InstagramControllerV2 {
  getInstagramPublishedPosts = asyncHandler(async (req, res) => {
    const { brandId, pageToken, limit, socialAccountId, startDate, endDate } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    const result = await instagramService.getPublishedVideos(brandId, pageToken || null, limit ? parseInt(limit) : 10, socialAccountId || null, startDate || null, endDate || null);
    v2Success(res, result);
  });

  searchAudio = asyncHandler(async (req, res) => {
    const { brandId, q } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    const result = await instagramService.searchAudio(brandId, q || '');
    v2Success(res, result);
  });
}

module.exports = new InstagramControllerV2();
