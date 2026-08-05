const feedService = require('../../services/workspace/feed.service');
const logger = require('../../utils/logger');

/**
 * GET /api/v2/content-extras/feeds
 * Lists this brand's custom feed sources plus every system (curated) feed source.
 */
exports.getFeedSources = async (req, res, next) => {
  try {
    const { brandId } = req.query;
    if (!brandId) {
      return res.status(400).json({ message: 'Missing required fields: brandId' });
    }

    const feedSources = await feedService.listFeedSources(brandId);

    return res.status(200).json({ message: 'Feed sources retrieved successfully', data: { feedSources } });
  } catch (error) {
    logger.error('Error in getFeedSources:', error);
    next(error);
  }
};

/**
 * POST /api/v2/content-extras/feeds
 * Brand adds their own RSS feed URL.
 */
exports.createFeedSource = async (req, res, next) => {
  try {
    const { brandId, name, url, category } = req.body;
    if (!brandId || !url) {
      return res.status(400).json({ message: 'Missing required fields: brandId, url' });
    }

    const feedSource = await feedService.createCustomFeedSource(brandId, { name, url, category });

    return res.status(201).json({ message: 'Feed source added successfully', data: feedSource });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    logger.error('Error in createFeedSource:', error);
    next(error);
  }
};

/**
 * DELETE /api/v2/content-extras/feeds/:id
 */
exports.deleteFeedSource = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { brandId } = req.query;
    if (!brandId) {
      return res.status(400).json({ message: 'Missing required fields: brandId' });
    }

    await feedService.deleteFeedSource(id, brandId);

    return res.status(200).json({ message: 'Feed source deleted successfully' });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    logger.error('Error in deleteFeedSource:', error);
    next(error);
  }
};

/**
 * GET /api/v2/content-extras/feeds/entries
 * Returns cached entries across this brand's feeds + system feeds, newest first.
 */
exports.getFeedEntries = async (req, res, next) => {
  try {
    const { brandId, limit } = req.query;
    if (!brandId) {
      return res.status(400).json({ message: 'Missing required fields: brandId' });
    }

    const parsedLimit = limit ? Math.min(parseInt(limit, 10) || 50, 100) : 50;
    const entries = await feedService.getFeedEntries(brandId, { limit: parsedLimit });

    return res.status(200).json({ message: 'Feed entries retrieved successfully', data: { entries } });
  } catch (error) {
    logger.error('Error in getFeedEntries:', error);
    next(error);
  }
};
