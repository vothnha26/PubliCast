const asyncHandler = require('../../utils/async-handler');
const aiService = require('../../services/workspace/ai/ai.service');

/**
 * v1 returns raw service results directly (res.json(config), etc.) with
 * NO {message, data} envelope, and 400s use { error } instead of
 * { message }. The frontend (frontend/src/services/ai.service.js) reads
 * the apiV2-passthrough result as the object itself — e.g. getConfig()
 * returns the config, not { data: config } — so v2 intentionally keeps
 * this exact flat shape rather than switching to v2Success/v2Error.
 */
class AiControllerV2 {
  getConfig = asyncHandler(async (req, res) => {
    const config = await aiService.getConfig();
    res.json(config);
  });

  getSettings = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) {
      return res.status(400).json({ error: 'Missing brandId parameter' });
    }
    const settings = await aiService.getSettings(brandId);
    res.json(settings);
  });

  updateSettings = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) {
      return res.status(400).json({ error: 'Missing brandId parameter' });
    }
    const settings = await aiService.updateSettings(brandId, req.body);
    res.json(settings);
  });

  generateContent = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    const userId = req.user.id;
    if (!brandId) {
      return res.status(400).json({ error: 'Missing brandId parameter' });
    }
    const result = await aiService.generateContent(userId, brandId, req.body);
    res.json(result);
  });

  quickPost = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    const userId = req.user.id;
    if (!brandId) {
      return res.status(400).json({ error: 'Missing brandId parameter' });
    }
    const post = await aiService.quickPost(userId, brandId, req.body);
    res.status(201).json(post);
  });

  getHistory = asyncHandler(async (req, res) => {
    const { brandId, page, limit } = req.query;
    if (!brandId) {
      return res.status(400).json({ error: 'Missing brandId parameter' });
    }
    const history = await aiService.getHistory(
      brandId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10
    );
    res.json(history);
  });
}

module.exports = new AiControllerV2();
