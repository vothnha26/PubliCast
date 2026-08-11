const templateService = require('../../services/admin/template.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success } = require('../../utils/response.helper');

class TemplateController {
  getFeaturedTemplates = asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    // Content is admin-curated and rarely changes; cached at the Cloudflare
    // edge for 30 minutes so most reads never hit the origin/DB. Each
    // distinct page/limit combination is its own cacheable URL, so this
    // header stays valid once pagination params are added.
    res.set('Cache-Control', 'public, max-age=1800');

    // page/limit are optional — omitting both preserves the exact legacy
    // response (categories with nested templates, no envelope) for
    // FeaturedTemplatesTab.jsx and any other existing caller.
    if (page === undefined && limit === undefined) {
      const categories = await templateService.getFeaturedTemplates();
      return v2Success(res, categories, 'Featured templates retrieved successfully');
    }

    // Paginated shape carries a meta envelope alongside data — v2Success's
    // fixed {message, data} shape has no slot for it, so this follows the
    // same plain-json + spread pattern postController.getPosts already
    // uses for its own paginated meta.
    const result = await templateService.getFeaturedTemplatesPage({ page, limit });
    return res.status(200).json({
      message: 'Featured templates retrieved successfully',
      ...result
    });
  });
}

module.exports = new TemplateController();
