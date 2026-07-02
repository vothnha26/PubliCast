const mediaLibraryService = require('../../services/workspace/media-library.service');
const asyncHandler = require('../../utils/async-handler');

class MediaLibraryController {
  /**
   * GET /api/media
   */
  getMediaFiles = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    const result = await mediaLibraryService.getMediaFiles(req.query, brandId);

    res.status(200).json({
      message: 'Media files retrieved successfully',
      ...result
    });
  });

  /**
   * POST /api/media/upload
   */
  uploadMedia = asyncHandler(async (req, res) => {
    const { brandId, folderId } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const userId = req.user.id;
    const media = await mediaLibraryService.uploadFile(req.file, brandId, userId, folderId);

    res.status(201).json({
      message: 'File uploaded successfully',
      data: media
    });
  });

  /**
   * DELETE /api/media/:id
   */
  deleteMedia = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId } = req.body; // Usually sent in body for DELETE or query
    
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    await mediaLibraryService.deleteMedia(id, brandId);

    res.status(200).json({
      message: 'Media file deleted successfully'
    });
  });

  /**
   * POST /api/media/save-direct
   */
  saveDirectMedia = asyncHandler(async (req, res) => {
    const { brandId, fileInfo, folderId } = req.body;
    const userId = req.user.id;
    
    if (!brandId || !fileInfo) {
      return res.status(400).json({ message: 'brandId and fileInfo are required' });
    }

    const media = await mediaLibraryService.saveDirectMedia(fileInfo, brandId, userId, folderId);

    res.status(201).json({
      message: 'Media info saved successfully',
      data: media
    });
  });

  /**
   * PATCH /api/media/:id/rename
   */
  renameMedia = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId, filename } = req.body;

    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    if (!filename) return res.status(400).json({ message: 'filename is required' });

    const media = await mediaLibraryService.renameMedia(id, brandId, filename);

    res.status(200).json({
      message: 'Media file renamed successfully',
      data: media
    });
  });
}

module.exports = new MediaLibraryController();
