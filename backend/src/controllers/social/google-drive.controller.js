const socialService = require('../../services/social/social.service');
const asyncHandler = require('../../utils/async-handler');

class GoogleDriveController {
  getGoogleDriveFiles = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const context = await socialService.getGoogleDriveContext(brandId);
    res.json(context);
  });

  downloadGoogleDriveFile = asyncHandler(async (req, res) => {
    const { brandId, fileId, fileName } = req.body;
    if (!brandId || !fileId || !fileName) {
      return res.status(400).json({ message: 'brandId, fileId, and fileName are required' });
    }

    const videoUrl = await socialService.downloadDriveFile(brandId, fileId, fileName);
    res.json({ videoUrl });
  });
}

module.exports = new GoogleDriveController();
