const threadsService = require('../../services/social/threads');
const asyncHandler = require('../../utils/async-handler');

class ThreadsController {
  getThreadsPublishedPosts = asyncHandler(async (req, res) => {
    const { brandId, pageToken, limit, socialAccountId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const result = await threadsService.getPublishedVideos(
      brandId,
      pageToken || null,
      limit ? parseInt(limit) : 10,
      socialAccountId || null
    );
    res.json(result);
  });
}

module.exports = new ThreadsController();
