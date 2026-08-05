const prisma = require('../../config/prisma');
const feedService = require('../../services/workspace/feed.service');
const asyncHandler = require('../../utils/async-handler');

class AdminFeedController {
  getSystemFeeds = asyncHandler(async (req, res) => {
    const feedSources = await prisma.feedSource.findMany({
      where: { isSystem: true },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }]
    });
    res.status(200).json({ message: 'System feeds retrieved successfully', data: { feedSources } });
  });

  createSystemFeed = asyncHandler(async (req, res) => {
    const { name, url, category } = req.body;
    const trimmedUrl = url?.trim();
    const trimmedName = name?.trim();
    if (!trimmedUrl || !trimmedName) {
      return res.status(400).json({ message: 'name and url are required' });
    }

    const feedSource = await prisma.feedSource.create({
      data: { brandId: null, name: trimmedName, url: trimmedUrl, category: category?.trim() || null, isSystem: true }
    });

    await feedService.refreshFeedSource(feedSource.id).catch(() => {});
    await feedService._purgeCuratedFeedsCache();

    res.status(201).json({ message: 'System feed created successfully', data: feedSource });
  });

  updateSystemFeed = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, url, category } = req.body;

    const existing = await prisma.feedSource.findUnique({ where: { id } });
    if (!existing || !existing.isSystem) {
      return res.status(404).json({ message: 'System feed not found' });
    }

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (url !== undefined) data.url = url.trim();
    if (category !== undefined) data.category = category?.trim() || null;

    const feedSource = await prisma.feedSource.update({ where: { id }, data });
    await feedService._purgeCuratedFeedsCache();
    res.status(200).json({ message: 'System feed updated successfully', data: feedSource });
  });

  deleteSystemFeed = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const existing = await prisma.feedSource.findUnique({ where: { id } });
    if (!existing || !existing.isSystem) {
      return res.status(404).json({ message: 'System feed not found' });
    }

    await prisma.feedSource.delete({ where: { id } });
    await feedService._purgeCuratedFeedsCache();
    res.status(200).json({ message: 'System feed deleted successfully' });
  });
}

module.exports = new AdminFeedController();
