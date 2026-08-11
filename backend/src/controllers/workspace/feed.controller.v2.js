const feedService = require('../../services/workspace/feed.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success, v2Error } = require('../../utils/response.helper');

exports.getFeedSources = asyncHandler(async (req, res) => {
  const { brandId } = req.query;
  if (!brandId) {
    return v2Error(res, 'Missing required fields: brandId', 400);
  }

  const feedSources = await feedService.listFeedSources(brandId);

  v2Success(res, { feedSources }, 'Feed sources retrieved successfully');
});

exports.createFeedSource = asyncHandler(async (req, res) => {
  const { brandId, name, url, category } = req.body;
  if (!brandId || !url) {
    return v2Error(res, 'Missing required fields: brandId, url', 400);
  }

  const feedSource = await feedService.createCustomFeedSource(brandId, { name, url, category });

  v2Success(res, feedSource, 'Feed source added successfully', 201);
});

exports.deleteFeedSource = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { brandId } = req.query;
  if (!brandId) {
    return v2Error(res, 'Missing required fields: brandId', 400);
  }

  await feedService.deleteFeedSource(id, brandId);

  v2Success(res, null, 'Feed source deleted successfully');
});

/**
 * Same for every brand — cacheable at the Cloudflare edge (matches v1's
 * Cache-Control header exactly).
 */
exports.getCuratedFeeds = asyncHandler(async (req, res) => {
  const data = await feedService.getCuratedFeeds();
  res.set('Cache-Control', 'public, max-age=1800');
  v2Success(res, data, 'Curated feeds retrieved successfully');
});

exports.getFeedEntries = asyncHandler(async (req, res) => {
  const { brandId, limit } = req.query;
  if (!brandId) {
    return v2Error(res, 'Missing required fields: brandId', 400);
  }

  const parsedLimit = limit ? Math.min(parseInt(limit, 10) || 50, 100) : 50;
  const entries = await feedService.getFeedEntries(brandId, { limit: parsedLimit });

  v2Success(res, { entries }, 'Feed entries retrieved successfully');
});
