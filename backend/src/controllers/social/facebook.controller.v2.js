const facebookService = require('../../services/social/facebook');
const brandRepository = require('../../repositories/workspace/brand.repository');
const asyncHandler = require('../../utils/async-handler');
const { v2Success, v2Error } = require('../../utils/response.helper');

/**
 * v2 envelope wrapper around FacebookController — delegates every call to
 * the same facebookService/brandRepository the v1 controller uses (no
 * reimplemented logic), only reshapes the response.
 */
class FacebookControllerV2 {
  getFacebookPublishedPosts = asyncHandler(async (req, res) => {
    const { brandId, pageToken, limit, socialAccountId, startDate, endDate } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    const result = await facebookService.getPublishedVideos(
      brandId,
      pageToken || null,
      limit ? parseInt(limit) : 10,
      socialAccountId || null,
      startDate || null,
      endDate || null
    );
    v2Success(res, result);
  });

  searchFacebookPages = asyncHandler(async (req, res) => {
    const { brandId, query } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);
    if (!query)   return v2Error(res, 'query is required', 400);

    const pages = await facebookService.searchChannel(brandId, query);
    v2Success(res, pages);
  });

  addFacebookCompetitor = asyncHandler(async (req, res) => {
    const { brandId, pageId } = req.body;
    if (!brandId) return v2Error(res, 'brandId is required', 400);
    if (!pageId)  return v2Error(res, 'pageId is required', 400);

    const competitor = await facebookService.addCompetitor(brandId, pageId);
    v2Success(res, competitor, 'Competitor added successfully', 201);
  });

  getFacebookCompetitors = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    const competitors = await facebookService.getCompetitors(brandId);
    v2Success(res, competitors);
  });

  deleteFacebookCompetitor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId } = req.query;
    if (!id) return v2Error(res, 'id is required', 400);
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    await facebookService.deleteCompetitor(id, brandId, req.user.id);
    v2Success(res, null, 'Competitor deleted successfully');
  });

  checkFacebookReelCopyright = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { brandId, socialAccountId } = req.query;

    if (!videoId) return v2Error(res, 'videoId is required', 400);
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    const canAccess = await brandRepository.userCanAccessBrand(req.user.id, brandId);
    if (!canAccess) return v2Error(res, 'You do not have access to this brand', 403);

    try {
      const status = await facebookService.checkReelCopyrightStatus(brandId, videoId, socialAccountId || null);
      v2Success(res, status);
    } catch (err) {
      console.error(`[FacebookControllerV2] checkFacebookReelCopyright failed for video ${videoId}:`, err.message);
      if (err.name === 'FacebookRateLimitError') {
        res.setHeader('Retry-After', err.retryAfterSeconds.toString());
        // Frontend reads err.response.data.retryAfterSeconds at the top
        // level (see useReelCopyrightStatus.js / api.js interceptors) —
        // v2Error's nested `errors` field would hide it, so this stays a
        // flat res.json() matching v1's exact shape instead.
        return res.status(429).json({
          message: err.message,
          retryAfterSeconds: err.retryAfterSeconds
        });
      }
      const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
      v2Error(res, err.message || 'Failed to check Facebook Reels copyright status', status);
    }
  });
}

module.exports = new FacebookControllerV2();
