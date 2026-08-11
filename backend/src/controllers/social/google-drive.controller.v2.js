const socialService = require('../../services/social/social.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success, v2Error } = require('../../utils/response.helper');

/**
 * v2 envelope wrapper around GoogleDriveController — delegates to the same
 * socialService the v1 controller uses, only reshapes the response.
 */
class GoogleDriveControllerV2 {
  getGoogleDriveFiles = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    const context = await socialService.getGoogleDriveContext(brandId);
    v2Success(res, context);
  });

  downloadGoogleDriveFile = asyncHandler(async (req, res) => {
    const { brandId, fileId, fileName } = req.body;
    if (!brandId || !fileId || !fileName) {
      return v2Error(res, 'brandId, fileId, and fileName are required', 400);
    }

    const videoUrl = await socialService.downloadDriveFile(brandId, fileId, fileName);
    v2Success(res, { videoUrl });
  });
}

module.exports = new GoogleDriveControllerV2();
