const asyncHandler = require('../../utils/async-handler');
const { blueskyService } = require('../../services/social/bluesky');
const blueskyController = require('./bluesky.controller');
const { v2Success, v2Error } = require('../../utils/response.helper');

/**
 * v2 envelope wrapper around BlueskyController's non-redirect endpoints
 * (auth URL / comments / published posts) — getClientMetadata and
 * blueskyCallback stay v1-only since they either serve a fixed OAuth
 * discovery document or 302 the browser, so a v2 envelope has no meaning
 * for them. Delegates to the same v1 instance/services (not a
 * reimplementation) so the OAuth/service logic has exactly one copy.
 */
class BlueskyControllerV2 {
  getBlueskyAuthUrl = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);
    const url = await blueskyController._buildBlueskyAuthUrl(req, brandId);
    v2Success(res, { url });
  });

  getBlueskyComments = asyncHandler(async (req, res) => {
    const { brandId, uri, depth, parentHeight, socialAccountId } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);
    if (!uri) return v2Error(res, 'Post URI (uri) is required', 400);

    const data = await blueskyService.getPostComments(brandId, {
      uri,
      depth: depth ? parseInt(depth) : 6,
      parentHeight: parentHeight ? parseInt(parentHeight) : 80,
      socialAccountId
    });
    v2Success(res, data);
  });

  getBlueskyPublishedPosts = asyncHandler(async (req, res) => {
    const { brandId, pageToken, limit, socialAccountId } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    const result = await blueskyService.getPublishedVideos(
      brandId,
      pageToken || null,
      limit ? parseInt(limit) : 10,
      socialAccountId || null
    );
    v2Success(res, result);
  });
}

module.exports = new BlueskyControllerV2();
