const searchService = require('../../services/core/search.service');
const asyncHandler = require('../../utils/async-handler');
const logger = require('../../utils/logger');

class SearchController {
  searchAll = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const user = req.user; // Attached by verifyAuth middleware

    logger.debug(`[Search API] Query: "${q}" | User: ID=${user?.id}, Role=${user?.role}`);

    if (!q || !q.trim()) {
      return res.status(200).json([]);
    }

    const results = await searchService.searchAll(q, user);
    logger.debug(`[Search API] Found ${results.length} results`);
    return res.status(200).json(results);
  });
}

module.exports = new SearchController();
