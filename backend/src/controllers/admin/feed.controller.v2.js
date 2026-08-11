const prisma = require('../../config/prisma');
const feedService = require('../../services/workspace/feed.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success, v2Error } = require('../../utils/response.helper');

class AdminFeedControllerV2 {
  getSystemFeeds = asyncHandler(async (req, res) => {
    const feedSources = await prisma.feedSource.findMany({
      where: { isSystem: true },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }]
    });
    v2Success(res, { feedSources }, 'System feeds retrieved successfully');
  });

  createSystemFeed = asyncHandler(async (req, res) => {
    const { name, url, category } = req.body;
    const trimmedUrl = url?.trim();
    const trimmedName = name?.trim();
    if (!trimmedUrl || !trimmedName) {
      return v2Error(res, 'name and url are required', 400);
    }

    const feedSource = await prisma.feedSource.create({
      data: { brandId: null, name: trimmedName, url: trimmedUrl, category: category?.trim() || null, isSystem: true }
    });

    await feedService.refreshFeedSource(feedSource.id).catch(() => {});
    await feedService._purgeCuratedFeedsCache();

    v2Success(res, feedSource, 'System feed created successfully', 201);
  });

  updateSystemFeed = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, url, category } = req.body;

    const existing = await prisma.feedSource.findUnique({ where: { id } });
    if (!existing || !existing.isSystem) {
      return v2Error(res, 'System feed not found', 404);
    }

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (url !== undefined) data.url = url.trim();
    if (category !== undefined) data.category = category?.trim() || null;

    const feedSource = await prisma.feedSource.update({ where: { id }, data });
    await feedService._purgeCuratedFeedsCache();
    v2Success(res, feedSource, 'System feed updated successfully');
  });

  deleteSystemFeed = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const existing = await prisma.feedSource.findUnique({ where: { id } });
    if (!existing || !existing.isSystem) {
      return v2Error(res, 'System feed not found', 404);
    }

    await prisma.feedSource.delete({ where: { id } });
    await feedService._purgeCuratedFeedsCache();
    v2Success(res, null, 'System feed deleted successfully');
  });
}

module.exports = new AdminFeedControllerV2();
