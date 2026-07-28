const mediaFolderRepository = require('../../repositories/workspace/media-folder.repository');

class MediaFolderService {
  async createFolder(name, brandId, parentId = null) {
    if (parentId) {
      const parentFolder = await mediaFolderRepository.findById(parentId);
      if (!parentFolder || parentFolder.brandId !== brandId) {
        const error = new Error('Folder not found');
        error.status = 404;
        throw error;
      }
    }
    return mediaFolderRepository.create({
      name,
      brandId,
      parentId
    });
  }

  async getFolders(brandId, parentId = null) {
    return mediaFolderRepository.findMany({
      brandId,
      parentId
    });
  }

  async updateFolder(id, name, brandId) {
    const folder = await mediaFolderRepository.findById(id);
    if (!folder || folder.brandId !== brandId) {
      throw new Error('Folder not found');
    }
    return mediaFolderRepository.update(id, { name });
  }

  async deleteFolder(id, brandId) {
    const folder = await mediaFolderRepository.findById(id);
    if (!folder || folder.brandId !== brandId) {
      throw new Error('Folder not found');
    }
    return mediaFolderRepository.delete(id);
  }
}

module.exports = new MediaFolderService();
