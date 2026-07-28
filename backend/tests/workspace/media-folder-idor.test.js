const mediaFolderService = require('../../src/services/workspace/media-folder.service');
const mediaLibraryService = require('../../src/services/workspace/media-library.service');
const mediaFolderRepository = require('../../src/repositories/workspace/media-folder.repository');
const mediaLibraryRepository = require('../../src/repositories/workspace/media-library.repository');

jest.mock('../../src/repositories/workspace/media-folder.repository');
jest.mock('../../src/repositories/workspace/media-library.repository');

describe('Media/Folder IDOR Security Guard (#257)', () => {
  const brandA = 'brand-A';
  const brandB = 'brand-B';
  const folderAId = 'folder-A-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createFolder', () => {
    it('should reject when parentId belongs to a different brand (IDOR attempt)', async () => {
      mediaFolderRepository.findById.mockResolvedValue({
        id: folderAId,
        brandId: brandA,
        name: 'Brand A Folder'
      });

      await expect(
        mediaFolderService.createFolder('Sub Folder', brandB, folderAId)
      ).rejects.toThrow('Folder not found');

      expect(mediaFolderRepository.create).not.toHaveBeenCalled();
    });

    it('should succeed when parentId is null or belongs to the same brand', async () => {
      mediaFolderRepository.findById.mockResolvedValue({
        id: folderAId,
        brandId: brandA,
        name: 'Brand A Folder'
      });
      mediaFolderRepository.create.mockResolvedValue({ id: 'folder-A-2', name: 'Sub', brandId: brandA, parentId: folderAId });

      const res = await mediaFolderService.createFolder('Sub', brandA, folderAId);
      expect(res.id).toBe('folder-A-2');
      expect(mediaFolderRepository.create).toHaveBeenCalled();
    });
  });

  describe('uploadFile', () => {
    it('should reject file upload when folderId belongs to a different brand', async () => {
      mediaFolderRepository.findById.mockResolvedValue({
        id: folderAId,
        brandId: brandA
      });

      const mockFile = { originalname: 'test.png', mimetype: 'image/png', size: 1024, path: '/tmp/test.png', filename: 'test.png' };

      await expect(
        mediaLibraryService.uploadFile(mockFile, brandB, 'user-1', folderAId)
      ).rejects.toThrow('Folder not found');

      expect(mediaLibraryRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('saveDirectMedia', () => {
    it('should reject direct media save when folderId belongs to a different brand', async () => {
      mediaFolderRepository.findById.mockResolvedValue({
        id: folderAId,
        brandId: brandA
      });

      const mockFileInfo = { public_id: 'p1', secure_url: 'http://cloud.com/p1.jpg', bytes: 500, format: 'jpg', resource_type: 'image' };

      await expect(
        mediaLibraryService.saveDirectMedia(mockFileInfo, brandB, 'user-1', folderAId, true)
      ).rejects.toThrow('Folder not found');

      expect(mediaLibraryRepository.create).not.toHaveBeenCalled();
    });
  });
});
