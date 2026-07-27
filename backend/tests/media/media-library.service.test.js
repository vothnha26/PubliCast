const mediaLibraryService = require('../../src/services/workspace/media-library.service');
const mediaLibraryRepository = require('../../src/repositories/workspace/media-library.repository');
const postRepository = require('../../src/repositories/workspace/post.repository');
const { cloudinary } = require('../../src/config/cloudinary');

jest.mock('../../src/repositories/workspace/media-library.repository', () => ({
  findManyAndCount: jest.fn(),
  findById: jest.fn(),
  delete: jest.fn(),
  create: jest.fn()
}));

jest.mock('../../src/repositories/workspace/post.repository', () => ({
  findMany: jest.fn()
}));

jest.mock('../../src/config/cloudinary', () => ({
  cloudinary: {
    uploader: {
      destroy: jest.fn().mockResolvedValue({ result: 'ok' })
    }
  }
}));

describe('MediaLibraryService Unit Tests', () => {
  beforeEach(() => {
    postRepository.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockFiles = [
    {
      id: 'file-1',
      brandId: 'brand-1',
      uploadedByUserId: 'user-1',
      filename: 'cat.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1048576, // 1 MB
      storageUrl: 'https://res.cloudinary.com/demo/image/upload/v1234/publicast/images/cat.jpg',
      mediaId: 'publicast/images/cat',
      folderId: 'folder-1',
      isUsed: true,
      width: 1920,
      height: 1080,
      createdAt: '2026-06-19T00:00:00Z',
      thumbnailUrl: null
    },
    {
      id: 'file-2',
      brandId: 'brand-1',
      uploadedByUserId: 'user-1',
      filename: 'tutorial.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 20971520, // 20 MB
      storageUrl: 'https://res.cloudinary.com/demo/video/upload/v5678/publicast/videos/tutorial.mp4',
      mediaId: 'publicast/videos/tutorial',
      folderId: null,
      isUsed: false,
      width: 1280,
      height: 720,
      durationSeconds: 125,
      createdAt: '2026-06-18T00:00:00Z',
      thumbnailUrl: null
    }
  ];

  describe('MEDIA_001 - getMediaFiles (Filter by Search)', () => {
    it('should query repository with search filter', async () => {
      mediaLibraryRepository.findManyAndCount.mockResolvedValue({
        files: [mockFiles[0]],
        total: 1
      });

      const queryParams = { search: 'cat' };
      const result = await mediaLibraryService.getMediaFiles(queryParams, 'brand-1');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('cat.jpg');
      expect(mediaLibraryRepository.findManyAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          brandId: 'brand-1',
          OR: expect.arrayContaining([
            { filename: { contains: 'cat' } },
            { tags: { contains: 'cat' } }
          ])
        }),
        expect.any(Object)
      );
    });
  });

  describe('MEDIA_002 - getMediaFiles (Filter by Type)', () => {
    it('should query image types correctly', async () => {
      mediaLibraryRepository.findManyAndCount.mockResolvedValue({
        files: [mockFiles[0]],
        total: 1
      });

      await mediaLibraryService.getMediaFiles({ type: 'image' }, 'brand-1');

      expect(mediaLibraryRepository.findManyAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          mimeType: { contains: 'image' }
        }),
        expect.any(Object)
      );
    });

    it('should query video types correctly', async () => {
      mediaLibraryRepository.findManyAndCount.mockResolvedValue({
        files: [mockFiles[1]],
        total: 1
      });

      await mediaLibraryService.getMediaFiles({ type: 'video' }, 'brand-1');

      expect(mediaLibraryRepository.findManyAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          mimeType: { contains: 'video' }
        }),
        expect.any(Object)
      );
    });
  });

  describe('MEDIA_003 - getMediaFiles (Filter by Folder / Used)', () => {
    it('should filter by folderId and isUsed status', async () => {
      mediaLibraryRepository.findManyAndCount.mockResolvedValue({
        files: [mockFiles[0]],
        total: 1
      });

      await mediaLibraryService.getMediaFiles({ folderId: 'folder-1', used: 'true' }, 'brand-1');

      expect(mediaLibraryRepository.findManyAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          folderId: 'folder-1',
          isUsed: true
        }),
        expect.any(Object)
      );
    });
  });

  describe('MEDIA_004 - getMediaFiles (Pagination & Sorting)', () => {
    it('should request correct pagination limit and sort settings', async () => {
      mediaLibraryRepository.findManyAndCount.mockResolvedValue({
        files: mockFiles,
        total: 2
      });

      const result = await mediaLibraryService.getMediaFiles({ page: 2, limit: 10, sortBy: 'filename', sortOrder: 'asc' }, 'brand-1');

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(mediaLibraryRepository.findManyAndCount).toHaveBeenCalledWith(
        expect.any(Object),
        {
          skip: 10,
          take: 10,
          orderBy: { filename: 'asc' }
        }
      );
    });
  });

  describe('MEDIA_005 - uploadFile (Success)', () => {
    it('should save file details in repository and return formatted model', async () => {
      const mockMulterFile = {
        path: 'https://res.cloudinary.com/demo/image/upload/v1234/publicast/images/test.jpg',
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 500000,
        filename: 'publicast/images/test'
      };

      mediaLibraryRepository.create.mockResolvedValue({
        id: 'file-new',
        brandId: 'brand-1',
        uploadedByUserId: 'user-1',
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 500000,
        storageUrl: mockMulterFile.path,
        mediaId: mockMulterFile.filename,
        folderId: null,
        createdAt: new Date(),
        isUsed: false
      });

      const result = await mediaLibraryService.uploadFile(mockMulterFile, 'brand-1', 'user-1');

      expect(result.name).toBe('test.jpg');
      expect(result.type).toBe('image');
      expect(mediaLibraryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          brandId: 'brand-1',
          uploadedByUserId: 'user-1',
          filename: 'test.jpg',
          sizeBytes: 500000
        })
      );
    });
  });

  describe('MEDIA_006 - deleteMedia (Success)', () => {
    it('should call Cloudinary uploader destroy BEFORE deleting from database', async () => {
      const targetFile = mockFiles[0];
      mediaLibraryRepository.findById.mockResolvedValue(targetFile);
      mediaLibraryRepository.delete.mockResolvedValue(targetFile);

      const callOrder = [];
      cloudinary.uploader.destroy.mockImplementation(async () => {
        callOrder.push('cloudinary.destroy');
        return { result: 'ok' };
      });
      mediaLibraryRepository.delete.mockImplementation(async () => {
        callOrder.push('db.delete');
        return targetFile;
      });

      const result = await mediaLibraryService.deleteMedia('file-1', 'brand-1');

      expect(result.success).toBe(true);
      expect(mediaLibraryRepository.findById).toHaveBeenCalledWith('file-1');
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('publicast/images/cat', { resource_type: 'image' });
      expect(mediaLibraryRepository.delete).toHaveBeenCalledWith('file-1');
      expect(callOrder).toEqual(['cloudinary.destroy', 'db.delete']);
    });

    it('treats Cloudinary "not found" as already-deleted and still deletes the DB record', async () => {
      const targetFile = mockFiles[0];
      mediaLibraryRepository.findById.mockResolvedValue(targetFile);
      cloudinary.uploader.destroy.mockResolvedValue({ result: 'not found' });

      const result = await mediaLibraryService.deleteMedia('file-1', 'brand-1');

      expect(result.success).toBe(true);
      expect(mediaLibraryRepository.delete).toHaveBeenCalledWith('file-1');
    });
  });

  describe('MEDIA_007 - deleteMedia (Not Found)', () => {
    it('should throw an error and skip Cloudinary delete if file is not found or brand mismatch', async () => {
      mediaLibraryRepository.findById.mockResolvedValue(null);

      await expect(mediaLibraryService.deleteMedia('invalid-id', 'brand-1')).rejects.toThrow('Media file not found');
      expect(mediaLibraryRepository.delete).not.toHaveBeenCalled();
      expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
    });

    it('should throw an error if the file belongs to another brand', async () => {
      mediaLibraryRepository.findById.mockResolvedValue(mockFiles[0]); // brand-1

      await expect(mediaLibraryService.deleteMedia('file-1', 'another-brand')).rejects.toThrow('Media file not found');
    });
  });

  describe('MEDIA_010 - deleteMedia (In use by a Post)', () => {
    it('rejects with 409 and skips both Cloudinary destroy and DB delete when a Post references the file', async () => {
      const targetFile = mockFiles[0];
      mediaLibraryRepository.findById.mockResolvedValue(targetFile);
      postRepository.findMany.mockResolvedValue([
        { id: 'post-1', title: 'Campaign Post', status: 'PUBLISHED' }
      ]);

      await expect(mediaLibraryService.deleteMedia('file-1', 'brand-1')).rejects.toMatchObject({
        status: 409,
        message: expect.stringContaining('đang được dùng')
      });

      expect(postRepository.findMany).toHaveBeenCalledWith(
        { brandId: 'brand-1', mediaUrls: { contains: targetFile.storageUrl } },
        { take: 5 }
      );
      expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
      expect(mediaLibraryRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('MEDIA_011 - deleteMedia (Cloudinary failure)', () => {
    it('rejects with 500 and does NOT delete the DB record when Cloudinary destroy fails', async () => {
      const targetFile = mockFiles[0];
      mediaLibraryRepository.findById.mockResolvedValue(targetFile);
      cloudinary.uploader.destroy.mockRejectedValue(new Error('Network timeout'));

      await expect(mediaLibraryService.deleteMedia('file-1', 'brand-1')).rejects.toMatchObject({
        status: 500
      });

      expect(mediaLibraryRepository.delete).not.toHaveBeenCalled();
    });

    it('rejects with 500 when Cloudinary returns a non-ok, non-"not found" result', async () => {
      const targetFile = mockFiles[0];
      mediaLibraryRepository.findById.mockResolvedValue(targetFile);
      cloudinary.uploader.destroy.mockResolvedValue({ result: 'rate_limited' });

      await expect(mediaLibraryService.deleteMedia('file-1', 'brand-1')).rejects.toMatchObject({
        status: 500
      });

      expect(mediaLibraryRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('MEDIA_008 - saveDirectMedia (Success)', () => {
    it('should save direct cloudinary upload info and return formatted metadata', async () => {
      const mockCloudinaryInfo = {
        filename: 'direct.mp4',
        resource_type: 'video',
        format: 'mp4',
        bytes: 1500000,
        secure_url: 'https://res.cloudinary.com/demo/video/upload/direct.mp4',
        public_id: 'publicast/videos/direct',
        width: 1920,
        height: 1080,
        duration: 45.5
      };

      mediaLibraryRepository.create.mockResolvedValue({
        id: 'file-direct',
        brandId: 'brand-1',
        uploadedByUserId: 'user-1',
        filename: 'direct.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1500000,
        storageUrl: mockCloudinaryInfo.secure_url,
        mediaId: mockCloudinaryInfo.public_id,
        folderId: 'folder-1',
        width: 1920,
        height: 1080,
        durationSeconds: 45.5,
        createdAt: new Date()
      });

      const result = await mediaLibraryService.saveDirectMedia(mockCloudinaryInfo, 'brand-1', 'user-1', 'folder-1');

      expect(result.id).toBe('file-direct');
      expect(result.type).toBe('video');
      expect(result.duration).toBe('0:45'); // 45.5s formatted
      expect(mediaLibraryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 1920,
          height: 1080,
          durationSeconds: 45.5,
          folderId: 'folder-1'
        })
      );
    });

    it('should format unsaved direct media without creating a database record when saveToLibrary is false', async () => {
      const mockCloudinaryInfo = {
        filename: 'temp_post_media.mp4',
        resource_type: 'video',
        format: 'mp4',
        bytes: 2000000,
        secure_url: 'https://res.cloudinary.com/demo/video/upload/temp_post_media.mp4',
        public_id: 'publicast/videos/temp_post_media',
        width: 1280,
        height: 720,
        duration: 30
      };

      const result = await mediaLibraryService.saveDirectMedia(mockCloudinaryInfo, 'brand-1', 'user-1', null, false);

      expect(mediaLibraryRepository.create).not.toHaveBeenCalled();
      expect(result.id).toBe('publicast/videos/temp_post_media');
      expect(result.url).toBe(mockCloudinaryInfo.secure_url);
      expect(result.type).toBe('video');
      expect(result.duration).toBe('0:30');
    });
  });

  describe('MEDIA_009 - directUpload (Thumbnail Auto-generation)', () => {
    it('should automatically replace /upload/ with Cloudinary thumbnail transformations', async () => {
      mediaLibraryRepository.findManyAndCount.mockResolvedValue({
        files: mockFiles,
        total: 2
      });

      const result = await mediaLibraryService.getMediaFiles({}, 'brand-1');

      // Check image thumbnail replacement
      expect(result.data[0].thumbnail).toContain('/upload/c_thumb,w_200,g_face/');
      // Check video thumbnail extension and replacement
      expect(result.data[1].thumbnail).toContain('/upload/c_thumb,w_200,g_face,so_auto/');
      expect(result.data[1].thumbnail.endsWith('.jpg')).toBe(true);
    });
  });
});
