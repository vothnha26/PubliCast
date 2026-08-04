const channelGroupService = require('../../services/social/channel-group.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success } = require('../../utils/response.helper');

class ChannelGroupController {
  list = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) {
      return res.status(400).json({ message: 'Missing brandId query parameter' });
    }
    const groups = await channelGroupService.listByBrand(brandId, req.user.id);
    return v2Success(res, groups, 'Channel groups retrieved successfully');
  });

  create = asyncHandler(async (req, res) => {
    const { brandId, name, color, visibility } = req.body;
    if (!brandId) {
      return res.status(400).json({ message: 'Missing required body field: brandId' });
    }
    const group = await channelGroupService.create(brandId, req.user.id, { name, color, visibility });
    return v2Success(res, group, 'Channel group created successfully', 201);
  });

  update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId, name, color, visibility, socialAccountIds } = req.body;
    if (!brandId) {
      return res.status(400).json({ message: 'Missing required body field: brandId' });
    }
    const group = await channelGroupService.update(id, brandId, req.user.id, { name, color, visibility, socialAccountIds });
    return v2Success(res, group, 'Channel group updated successfully');
  });

  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId } = req.query;
    if (!brandId) {
      return res.status(400).json({ message: 'Missing brandId query parameter' });
    }
    const result = await channelGroupService.delete(id, brandId, req.user.id);
    return v2Success(res, null, result.message);
  });
}

module.exports = new ChannelGroupController();
