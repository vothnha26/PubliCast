const platformLimitService = require('../../services/admin/platform-limit.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success } = require('../../utils/response.helper');

class PlatformLimitControllerV2 {
  getPlatformLimits = asyncHandler(async (req, res) => {
    const limits = await platformLimitService.getPlatformLimits();
    v2Success(res, limits, 'Platform limits retrieved successfully');
  });

  getPlatformLimitById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const limit = await platformLimitService.getPlatformLimitById(id);
    v2Success(res, limit, 'Platform limit configuration retrieved successfully');
  });

  createPlatformLimit = asyncHandler(async (req, res) => {
    const limit = await platformLimitService.createPlatformLimit(req.body);
    v2Success(res, limit, 'Platform limit configuration created successfully', 201);
  });

  updatePlatformLimit = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const limit = await platformLimitService.updatePlatformLimit(id, req.body);
    v2Success(res, limit, 'Platform limit configuration updated successfully');
  });

  toggleLock = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isLocked, lockReason } = req.body;
    const limit = await platformLimitService.toggleLock(id, isLocked, lockReason);
    v2Success(res, limit, `Platform limit configuration ${isLocked ? 'locked' : 'unlocked'} successfully`);
  });

  deletePlatformLimit = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const limit = await platformLimitService.deletePlatformLimit(id);
    v2Success(res, limit, 'Platform limit configuration deleted successfully');
  });
}

module.exports = new PlatformLimitControllerV2();
