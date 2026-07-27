const mediaFolderService = require('../../services/workspace/media-folder.service');
const asyncHandler = require('../../utils/async-handler');

class MediaFolderController {
  createFolder = asyncHandler(async (req, res) => {
    const { name, brandId, parentId } = req.body;
    if (!name || !brandId) {
      return res.status(400).json({ message: 'Name and brandId are required' });
    }

    const folder = await mediaFolderService.createFolder(name, brandId, parentId);
    res.status(201).json({
      message: 'Folder created successfully',
      data: folder
    });
  });

  getFolders = asyncHandler(async (req, res) => {
    const { brandId, parentId } = req.query;
    if (!brandId) {
      return res.status(400).json({ message: 'brandId is required' });
    }

    const folders = await mediaFolderService.getFolders(brandId, parentId || null);
    res.status(200).json({
      message: 'Folders retrieved successfully',
      data: folders
    });
  });

  updateFolder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, brandId } = req.body;
    if (!name || !brandId) {
      return res.status(400).json({ message: 'Name and brandId are required' });
    }

    const folder = await mediaFolderService.updateFolder(id, name, brandId);
    res.status(200).json({
      message: 'Folder updated successfully',
      data: folder
    });
  });

  deleteFolder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId } = req.body;
    if (!brandId) {
      return res.status(400).json({ message: 'brandId is required' });
    }

    await mediaFolderService.deleteFolder(id, brandId);
    res.status(200).json({
      message: 'Folder deleted successfully'
    });
  });
}

module.exports = new MediaFolderController();
