const mediaFolderService = require('../../services/workspace/media-folder.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success, v2Error } = require('../../utils/response.helper');

class MediaFolderControllerV2 {
  createFolder = asyncHandler(async (req, res) => {
    const { name, brandId, parentId } = req.body;
    if (!name || !brandId) {
      return v2Error(res, 'Name and brandId are required', 400);
    }

    const folder = await mediaFolderService.createFolder(name, brandId, parentId);
    v2Success(res, folder, 'Folder created successfully', 201);
  });

  getFolders = asyncHandler(async (req, res) => {
    const { brandId, parentId } = req.query;
    if (!brandId) {
      return v2Error(res, 'brandId is required', 400);
    }

    const folders = await mediaFolderService.getFolders(brandId, parentId || null);
    v2Success(res, folders, 'Folders retrieved successfully');
  });

  updateFolder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, brandId } = req.body;
    if (!name || !brandId) {
      return v2Error(res, 'Name and brandId are required', 400);
    }

    const folder = await mediaFolderService.updateFolder(id, name, brandId);
    v2Success(res, folder, 'Folder updated successfully');
  });

  deleteFolder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId } = req.body;
    if (!brandId) {
      return v2Error(res, 'brandId is required', 400);
    }

    await mediaFolderService.deleteFolder(id, brandId);
    v2Success(res, null, 'Folder deleted successfully');
  });
}

module.exports = new MediaFolderControllerV2();
