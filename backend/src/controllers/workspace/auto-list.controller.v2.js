const autoListService = require('../../services/workspace/auto-list.service');
const asyncHandler = require('../../utils/async-handler');
const logger = require('../../utils/logger');
const { v2Error } = require('../../utils/response.helper');

/**
 * v1's responses are a bare { data } with no `message` key — kept as-is
 * (not routed through v2Success, which would add a "Success" message) so
 * the shape is unchanged for whatever's already consuming it.
 */
class AutoListControllerV2 {
  getAutoLists = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);
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
    if (!brandId) return v2Error(res, 'brandId is required', 400);
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
      return v2Error(res, 'orderedPostIds array is required', 400);
    }
    const data = await autoListService.reorderPosts(id, orderedPostIds, req.user.id);
    res.json({ data });
  });
}

module.exports = new AutoListControllerV2();
