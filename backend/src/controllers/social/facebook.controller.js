const facebookService = require('../../services/social/facebook');
const brandRepository = require('../../repositories/workspace/brand.repository');
const asyncHandler = require('../../utils/async-handler');

class FacebookController {
  // ── Published Posts ────────────────────────────────────────────────────────
  getFacebookPublishedPosts = asyncHandler(async (req, res) => {
    const { brandId, pageToken, limit } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const result = await facebookService.getPublishedVideos(
      brandId,
      pageToken || null,
      limit ? parseInt(limit) : 10
    );
    res.json(result);
  });

  // ── Competitors — Search ───────────────────────────────────────────────────
  searchFacebookPages = asyncHandler(async (req, res) => {
    const { brandId, query } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    if (!query)   return res.status(400).json({ message: 'query is required' });

    const pages = await facebookService.searchChannel(brandId, query);
    res.json({ data: pages });
  });

  // ── Competitors — Add ──────────────────────────────────────────────────────
  addFacebookCompetitor = asyncHandler(async (req, res) => {
    const { brandId, pageId } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    if (!pageId)  return res.status(400).json({ message: 'pageId is required' });

    const competitor = await facebookService.addCompetitor(brandId, pageId);
    res.status(201).json({ message: 'Competitor added successfully', data: competitor });
  });

  // ── Competitors — List ─────────────────────────────────────────────────────
  getFacebookCompetitors = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const competitors = await facebookService.getCompetitors(brandId);
    res.json({ data: competitors });
  });

  // ── Competitors — Delete ───────────────────────────────────────────────────
  deleteFacebookCompetitor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId } = req.query;
    if (!id) return res.status(400).json({ message: 'id is required' });
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    await facebookService.deleteCompetitor(id, brandId, req.user.id);
    res.json({ message: 'Competitor deleted successfully' });
  });

  // ── Post Detail — Insights ─────────────────────────────────────────────────
  getFacebookPostInsights = asyncHandler(async (req, res) => {
    const { brandId, postId, socialAccountId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    if (!postId) return res.status(400).json({ message: 'postId is required' });

    const canAccess = await brandRepository.userCanAccessBrand(req.user.id, brandId);
    if (!canAccess) return res.status(403).json({ message: 'You do not have access to this brand' });

    try {
      const details = await facebookService.getPostDetails(brandId, postId, socialAccountId || null);
      res.json({ data: details });
    } catch (err) {
      console.error(`[FacebookController] getFacebookPostInsights failed for post ${postId}:`, err.message);
      res.status(err.status && err.status >= 400 && err.status < 500 ? err.status : 500).json({
        message: err.message || 'Failed to fetch Facebook post insights'
      });
    }
  });

  // ── Post Detail — Analytics (Timeseries growth) ────────────────────────────
  getFacebookPostAnalytics = asyncHandler(async (req, res) => {
    const { brandId, postId, socialAccountId, startDate, endDate } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    if (!postId) return res.status(400).json({ message: 'postId is required' });

    const canAccess = await brandRepository.userCanAccessBrand(req.user.id, brandId);
    if (!canAccess) return res.status(403).json({ message: 'You do not have access to this brand' });

    try {
      const analytics = await facebookService.getPostAnalytics(brandId, postId, startDate || null, endDate || null, socialAccountId || null);
      res.json({ data: analytics });
    } catch (err) {
      console.error(`[FacebookController] getFacebookPostAnalytics failed for post ${postId}:`, err.message);
      res.status(err.status && err.status >= 400 && err.status < 500 ? err.status : 500).json({
        message: err.message || 'Failed to fetch Facebook post analytics'
      });
    }
  });

  // ── Reels — Copyright Check ────────────────────────────────────────────────
  checkFacebookReelCopyright = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { brandId, socialAccountId } = req.query;

    if (!videoId) return res.status(400).json({ message: 'videoId is required' });
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const canAccess = await brandRepository.userCanAccessBrand(req.user.id, brandId);
    if (!canAccess) return res.status(403).json({ message: 'You do not have access to this brand' });

    try {
      const status = await facebookService.checkReelCopyrightStatus(brandId, videoId, socialAccountId || null);
      res.json({ data: status });
    } catch (err) {
      console.error(`[FacebookController] checkFacebookReelCopyright failed for video ${videoId}:`, err.message);
      if (err.name === 'FacebookRateLimitError') {
        res.setHeader('Retry-After', err.retryAfterSeconds.toString());
        return res.status(429).json({
          message: err.message,
          retryAfterSeconds: err.retryAfterSeconds
        });
      }
      res.status(err.status && err.status >= 400 && err.status < 500 ? err.status : 500).json({
        message: err.message || 'Failed to check Facebook Reels copyright status'
      });
    }
  });
}

module.exports = new FacebookController();
