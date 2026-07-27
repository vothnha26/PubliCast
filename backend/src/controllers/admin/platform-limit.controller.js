const platformLimitService = require('../../services/admin/platform-limit.service');
const asyncHandler = require('../../utils/async-handler');

class PlatformLimitController {
  /**
   * GET /api/admin/platform-limits
   */
  getPlatformLimits = asyncHandler(async (req, res) => {
    const limits = await platformLimitService.getPlatformLimits();
    res.status(200).json({
      message: 'Platform limits retrieved successfully',
      data: limits
    });
  });

  /**
   * GET /api/admin/platform-limits/:id
   */
  getPlatformLimitById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const limit = await platformLimitService.getPlatformLimitById(id);
    res.status(200).json({
      message: 'Platform limit configuration retrieved successfully',
      data: limit
    });
  });

  /**
   * POST /api/admin/platform-limits
   */
  createPlatformLimit = asyncHandler(async (req, res) => {
    const limit = await platformLimitService.createPlatformLimit(req.body);
    res.status(201).json({
      message: 'Platform limit configuration created successfully',
      data: limit
    });
  });

  /**
   * PUT /api/admin/platform-limits/:id
   */
  updatePlatformLimit = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const limit = await platformLimitService.updatePlatformLimit(id, req.body);
    res.status(200).json({
      message: 'Platform limit configuration updated successfully',
      data: limit
    });
  });

  /**
   * PATCH /api/admin/platform-limits/:id/lock
   */
  toggleLock = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isLocked, lockReason } = req.body;
    const limit = await platformLimitService.toggleLock(id, isLocked, lockReason);
    res.status(200).json({
      message: `Platform limit configuration ${isLocked ? 'locked' : 'unlocked'} successfully`,
      data: limit
    });
  });

  /**
   * DELETE /api/admin/platform-limits/:id
   */
  deletePlatformLimit = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const limit = await platformLimitService.deletePlatformLimit(id);
    res.status(200).json({
      message: 'Platform limit configuration deleted successfully',
      data: limit
    });
  });
}

module.exports = new PlatformLimitController();
