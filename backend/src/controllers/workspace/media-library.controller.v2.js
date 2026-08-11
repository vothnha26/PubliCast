const mediaLibraryService = require('../../services/workspace/media-library.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success, v2Error } = require('../../utils/response.helper');

class MediaLibraryControllerV2 {
  // Keeps v1's flat { message, data, meta } shape (not nested under data)
  // — same reasoning as admin's audit-log endpoint: apiV2's pagination
  // unwrap depends on top-level meta.
  getMediaFiles = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    const result = await mediaLibraryService.getMediaFiles(req.query, brandId);

    res.status(200).json({
      message: 'Media files retrieved successfully',
      ...result
    });
  });

  uploadMedia = asyncHandler(async (req, res) => {
    const { brandId, folderId } = req.body;
    if (!brandId) return v2Error(res, 'brandId is required', 400);
    if (!req.file) return v2Error(res, 'No file uploaded', 400);

    const userId = req.user.id;
    const media = await mediaLibraryService.uploadFile(req.file, brandId, userId, folderId);

    v2Success(res, media, 'File uploaded successfully', 201);
  });

  deleteMedia = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId } = req.body;

    if (!brandId) return v2Error(res, 'brandId is required', 400);

    await mediaLibraryService.deleteMedia(id, brandId);

    v2Success(res, null, 'Media file deleted successfully');
  });

  saveDirectMedia = asyncHandler(async (req, res) => {
    const { brandId, fileInfo, folderId, saveToLibrary } = req.body;
    const userId = req.user.id;

    if (!brandId || !fileInfo) {
      return v2Error(res, 'brandId and fileInfo are required', 400);
    }

    const shouldSave = saveToLibrary !== false && saveToLibrary !== 'false';
    const media = await mediaLibraryService.saveDirectMedia(fileInfo, brandId, userId, folderId, shouldSave);

    v2Success(res, media, shouldSave ? 'Media info saved successfully' : 'Media uploaded successfully', 201);
  });

  renameMedia = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId, filename } = req.body;

    if (!brandId) return v2Error(res, 'brandId is required', 400);
    if (!filename) return v2Error(res, 'filename is required', 400);

    const media = await mediaLibraryService.renameMedia(id, brandId, filename);

    v2Success(res, media, 'Media file renamed successfully');
  });
}

module.exports = new MediaLibraryControllerV2();
