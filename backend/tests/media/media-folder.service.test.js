// Mock dependencies
jest.mock('../../src/repositories/workspace/media-folder.repository', () => ({
  create: jest.fn(),
  findMany: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}));

const mediaFolderService = require('../../src/services/workspace/media-folder.service');
const mediaFolderRepository = require('../../src/repositories/workspace/media-folder.repository');

describe('MediaFolderService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createFolder()', () => {
    it('should call repository.create with correct data', async () => {
      const name = 'New Folder';
      const brandId = 'brand-abc';
      const parentId = 'parent-folder-123';
      const mockResult = { id: 'folder-new', name, brandId, parentId };

      mediaFolderRepository.findById.mockResolvedValue({ id: parentId, brandId });
      mediaFolderRepository.create.mockResolvedValue(mockResult);

      const result = await mediaFolderService.createFolder(name, brandId, parentId);

      expect(result).toEqual(mockResult);
      expect(mediaFolderRepository.create).toHaveBeenCalledWith({
        name,
        brandId,
        parentId
      });
    });

    it('should default parentId to null if not provided', async () => {
      const name = 'Root Folder';
      const brandId = 'brand-abc';
      
      await mediaFolderService.createFolder(name, brandId);

      expect(mediaFolderRepository.create).toHaveBeenCalledWith({
        name,
        brandId,
        parentId: null
      });
    });

    it('should reject with 404 when parentId belongs to a different brand', async () => {
      const name = 'New Folder';
      const brandId = 'brand-abc';
      const parentId = 'parent-folder-123';

      mediaFolderRepository.findById.mockResolvedValue({ id: parentId, brandId: 'brand-other' });

      await expect(mediaFolderService.createFolder(name, brandId, parentId)).rejects.toMatchObject({
        message: 'Folder not found',
        status: 404
      });
      expect(mediaFolderRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getFolders()', () => {
    it('should call repository.findMany with brandId and parentId', async () => {
      const brandId = 'brand-abc';
      const parentId = 'parent-folder-123';
      const mockResult = [{ id: 'folder-1', name: 'Child Folder', brandId, parentId }];

      mediaFolderRepository.findMany.mockResolvedValue(mockResult);

      const result = await mediaFolderService.getFolders(brandId, parentId);

      expect(result).toEqual(mockResult);
      expect(mediaFolderRepository.findMany).toHaveBeenCalledWith({
        brandId,
        parentId
      });
    });

    it('should default parentId to null if not provided', async () => {
      const brandId = 'brand-abc';
      await mediaFolderService.getFolders(brandId);

      expect(mediaFolderRepository.findMany).toHaveBeenCalledWith({
        brandId,
        parentId: null
      });
    });
  });

  describe('updateFolder()', () => {
    it('should update folder name if folder exists and belongs to the brand', async () => {
      const id = 'folder-1';
      const name = 'Updated Folder Name';
      const brandId = 'brand-abc';
      const existingFolder = { id, name: 'Old Folder Name', brandId };
      const mockResult = { id, name, brandId };

      mediaFolderRepository.findById.mockResolvedValue(existingFolder);
      mediaFolderRepository.update.mockResolvedValue(mockResult);

      const result = await mediaFolderService.updateFolder(id, name, brandId);

      expect(result).toEqual(mockResult);
      expect(mediaFolderRepository.findById).toHaveBeenCalledWith(id);
      expect(mediaFolderRepository.update).toHaveBeenCalledWith(id, { name });
    });

    it('should throw "Folder not found" error if folder does not exist', async () => {
      mediaFolderRepository.findById.mockResolvedValue(null);

      await expect(mediaFolderService.updateFolder('non-existent', 'New Name', 'brand-abc'))
        .rejects.toThrow('Folder not found');

      expect(mediaFolderRepository.update).not.toHaveBeenCalled();
    });

    it('should throw "Folder not found" error if folder belongs to another brand', async () => {
      const existingFolder = { id: 'folder-1', name: 'Old Name', brandId: 'brand-other' };
      mediaFolderRepository.findById.mockResolvedValue(existingFolder);

      await expect(mediaFolderService.updateFolder('folder-1', 'New Name', 'brand-abc'))
        .rejects.toThrow('Folder not found');

      expect(mediaFolderRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteFolder()', () => {
    it('should delete folder if folder exists and belongs to the brand', async () => {
      const id = 'folder-1';
      const brandId = 'brand-abc';
      const existingFolder = { id, name: 'Folder to Delete', brandId };
      const mockResult = { id, name: 'Folder to Delete', brandId };

      mediaFolderRepository.findById.mockResolvedValue(existingFolder);
      mediaFolderRepository.delete.mockResolvedValue(mockResult);

      const result = await mediaFolderService.deleteFolder(id, brandId);

      expect(result).toEqual(mockResult);
      expect(mediaFolderRepository.findById).toHaveBeenCalledWith(id);
      expect(mediaFolderRepository.delete).toHaveBeenCalledWith(id);
    });

    it('should throw "Folder not found" error if folder does not exist during delete', async () => {
      mediaFolderRepository.findById.mockResolvedValue(null);

      await expect(mediaFolderService.deleteFolder('non-existent', 'brand-abc'))
        .rejects.toThrow('Folder not found');

      expect(mediaFolderRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw "Folder not found" error if folder belongs to another brand during delete', async () => {
      const existingFolder = { id: 'folder-1', name: 'Folder', brandId: 'brand-other' };
      mediaFolderRepository.findById.mockResolvedValue(existingFolder);

      await expect(mediaFolderService.deleteFolder('folder-1', 'brand-abc'))
        .rejects.toThrow('Folder not found');

      expect(mediaFolderRepository.delete).not.toHaveBeenCalled();
    });
  });
});
