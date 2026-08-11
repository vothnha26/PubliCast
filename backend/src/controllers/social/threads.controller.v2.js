const threadsService = require('../../services/social/threads');
const asyncHandler = require('../../utils/async-handler');
const { v2Success, v2Error } = require('../../utils/response.helper');

/**
 * v2 envelope wrapper around ThreadsController — delegates to the same
 * threadsService the v1 controller uses, only reshapes the response.
 */
class ThreadsControllerV2 {
  getThreadsPublishedPosts = asyncHandler(async (req, res) => {
    const { brandId, pageToken, limit, socialAccountId, startDate, endDate } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    const result = await threadsService.getPublishedVideos(
      brandId,
      pageToken || null,
      limit ? parseInt(limit) : 10,
      socialAccountId || null,
      startDate || null,
      endDate || null
    );
    v2Success(res, result);
  });
}

module.exports = new ThreadsControllerV2();
