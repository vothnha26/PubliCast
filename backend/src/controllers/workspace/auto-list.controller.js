const autoListService = require('../../services/workspace/auto-list.service');
const asyncHandler = require('../../utils/async-handler');
const logger = require('../../utils/logger');

class AutoListController {
  getAutoLists = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    const data = await autoListService.getAutoLists(brandId);
    res.json({ data });
  });

  getAutoListDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await autoListService.getAutoListDetails(id, req.user.id);
    res.json({ data });
  });

  createAutoList = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    const data = await autoListService.createAutoList(brandId, req.body, req.user.id);
    res.status(201).json({ data });
  });

  updateAutoList = asyncHandler(async (req, res) => {
    const { id } = req.params;
    logger.debug(`[updateAutoList] id=${id} | body:`, JSON.stringify(req.body, null, 2));
    const data = await autoListService.updateAutoList(id, req.body, req.user.id);
    res.json({ data });
  });

  deleteAutoList = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await autoListService.deleteAutoList(id, req.user.id);
    res.json({ message: 'AutoList deleted' });
  });

  toggleStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await autoListService.toggleStatus(id, req.user.id);
    res.json({ data });
  });

  reorderPosts = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { orderedPostIds } = req.body;
    if (!orderedPostIds || !Array.isArray(orderedPostIds)) {
      return res.status(400).json({ message: 'orderedPostIds array is required' });
    }
    const data = await autoListService.reorderPosts(id, orderedPostIds, req.user.id);
    res.json({ data });
  });
}

module.exports = new AutoListController();
