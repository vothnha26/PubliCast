const templateService = require('../../services/admin/template.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success } = require('../../utils/response.helper');

class TemplateController {
  getFeaturedTemplates = asyncHandler(async (req, res) => {
    const categories = await templateService.getFeaturedTemplates();
    // Long edge/browser cache — content is admin-curated and rarely
    // changes; the service already invalidates its own Redis cache on
    // writes, but a stale HTTP-cached response can only be cleared by a
    // hard refresh or waiting out max-age, so keep this shorter than the
    // Redis TTL to avoid serving very stale data from a CDN.
    res.set('Cache-Control', 'public, max-age=1800');
    return v2Success(res, categories, 'Featured templates retrieved successfully');
  });
}

module.exports = new TemplateController();
