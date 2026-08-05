const templateService = require('../../services/admin/template.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success } = require('../../utils/response.helper');

class TemplateController {
  getFeaturedTemplates = asyncHandler(async (req, res) => {
    const categories = await templateService.getFeaturedTemplates();
    // Content is admin-curated and rarely changes; cached at the Cloudflare
    // edge for 30 minutes so most reads never hit the origin/DB.
    res.set('Cache-Control', 'public, max-age=1800');
    return v2Success(res, categories, 'Featured templates retrieved successfully');
  });
}

module.exports = new TemplateController();
