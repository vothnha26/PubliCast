const postService = require('../../src/services/workspace/post.service');
const { cloudinary } = require('../../src/config/cloudinary');
const fs = require('fs');
const path = require('path');

// Mock Cloudinary API
jest.mock('../../src/config/cloudinary', () => ({
  cloudinary: {
    uploader: {
      destroy: jest.fn()
    }
  }
}));

// Mock fs module cho bối cảnh test file local
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    existsSync: jest.fn(),
    unlinkSync: jest.fn()
  };
});

describe('PostService.deleteUploadedAsset Unit Tests', () => {
  const originalEnv = process.env.UPLOAD_STORAGE;

  afterEach(() => {
    jest.clearAllMocks();
    process.env.UPLOAD_STORAGE = originalEnv;
  });

  describe('1. Input Validation Cases', () => {
    it('should return error if fileUrl is null or empty', async () => {
      const result = await postService.deleteUploadedAsset(null);
      expect(result).toEqual({ deleted: false, reason: 'Invalid file URL provided' });
    });

    it('should return error if fileUrl is not a string', async () => {
      const result = await postService.deleteUploadedAsset(12345);
      expect(result).toEqual({ deleted: false, reason: 'Invalid file URL provided' });
    });
  });

  describe('2. Local Storage Handling & Security Checks', () => {
    beforeEach(() => {
      process.env.UPLOAD_STORAGE = 'local';
    });

    it('should throw 403 Forbidden error on Path Traversal attempt', async () => {
      const maliciousUrl = '/uploads/../src/config/database.js';
      await expect(postService.deleteUploadedAsset(maliciousUrl)).rejects.toThrow(
        'Access denied: File path outside of uploads directory'
      );
    });

    it('should delete local file successfully if file exists', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockImplementation(() => {});

      const result = await postService.deleteUploadedAsset('/uploads/videos/test-clip.mp4');

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(result).toEqual({
        deleted: true,
        type: 'local',
        path: 'uploads/videos/test-clip.mp4'
      });
    });

    it('should return not found if local file does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      const result = await postService.deleteUploadedAsset('/uploads/images/non-existent.png');

      expect(result).toEqual({
        deleted: false,
        reason: 'File not found on server'
      });
    });
  });

  describe('3. Cloudinary Asset Cleanup & Public ID Parsing', () => {
    beforeEach(() => {
      process.env.UPLOAD_STORAGE = 'cloudinary';
    });

    it('should parse standard image publicId including folder hierarchy and call destroy with image resource_type', async () => {
      cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });

      const url = 'https://res.cloudinary.com/demo/image/upload/v1612345/publicast/images/sample_pic.jpg';
      const result = await postService.deleteUploadedAsset(url);

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        'publicast/images/sample_pic',
        { invalidate: true, resource_type: 'image' }
      );
      expect(result).toEqual({
        deleted: true,
        type: 'cloudinary',
        publicId: 'publicast/images/sample_pic',
        result: 'ok'
      });
    });

    it('should parse video publicId correctly and use video resource_type', async () => {
      cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });

      const url = 'https://res.cloudinary.com/demo/video/upload/v1612345/publicast/videos/sample_video.mp4';
      const result = await postService.deleteUploadedAsset(url);

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        'publicast/videos/sample_video',
        { invalidate: true, resource_type: 'video' }
      );
      expect(result.deleted).toBe(true);
    });

    it('should parse URL with transformation params correctly without mixing transformations into publicId', async () => {
      cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });

      const url = 'https://res.cloudinary.com/demo/image/upload/c_scale,w_500/v1612345/publicast/images/transformed_pic.png';
      const result = await postService.deleteUploadedAsset(url);

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        'publicast/images/transformed_pic',
        { invalidate: true, resource_type: 'image' }
      );
      expect(result.publicId).toBe('publicast/images/transformed_pic');
    });

    it('should fallback to video resource_type if initial image destroy returns not found', async () => {
      cloudinary.uploader.destroy
        .mockResolvedValueOnce({ result: 'not found' })
        .mockResolvedValueOnce({ result: 'ok' });

      const url = 'https://res.cloudinary.com/demo/image/upload/v1612345/publicast/media/unknown_asset';
      const result = await postService.deleteUploadedAsset(url);

      expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        deleted: true,
        type: 'cloudinary',
        publicId: 'publicast/media/unknown_asset',
        resourceType: 'video'
      });
    });
  });
});
