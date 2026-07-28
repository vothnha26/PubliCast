const mediaLibraryService = require('../../src/services/workspace/media-library.service');
const mediaLibraryRepository = require('../../src/repositories/workspace/media-library.repository');
const postRepository = require('../../src/repositories/workspace/post.repository');

jest.mock('../../src/repositories/workspace/media-library.repository');
jest.mock('../../src/repositories/workspace/post.repository');

describe('Media Library isUsed Synchronization Guard (#258)', () => {
  const brandId = 'brand-123';
  const url1 = 'http://example.com/image1.jpg';
  const url2 = 'http://example.com/image2.jpg';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncMediaUsage', () => {
    it('should set isUsed = true for newly added media URLs', async () => {
      mediaLibraryRepository.updateUsageByUrls.mockResolvedValue({ count: 1 });

      await mediaLibraryService.syncMediaUsage(brandId, [url1, url2], []);

      expect(mediaLibraryRepository.updateUsageByUrls).toHaveBeenCalledWith(
        brandId,
        [url1, url2],
        true,
        expect.anything()
      );
    });

    it('should set isUsed = false for removed media URL if no other posts reference it', async () => {
      postRepository.findMany.mockResolvedValue([]);
      mediaLibraryRepository.updateUsageByUrls.mockResolvedValue({ count: 1 });

      await mediaLibraryService.syncMediaUsage(brandId, [], [url1]);

      expect(postRepository.findMany).toHaveBeenCalledWith(
        { brandId, mediaUrls: { contains: url1 } },
        { take: 1 }
      );
      expect(mediaLibraryRepository.updateUsageByUrls).toHaveBeenCalledWith(
        brandId,
        [url1],
        false,
        expect.anything()
      );
    });

    it('should keep isUsed = true for removed media URL if another post still references it', async () => {
      postRepository.findMany.mockResolvedValue([{ id: 'post-other', mediaUrls: url1 }]);

      await mediaLibraryService.syncMediaUsage(brandId, [], [url1]);

      expect(postRepository.findMany).toHaveBeenCalledWith(
        { brandId, mediaUrls: { contains: url1 } },
        { take: 1 }
      );
      expect(mediaLibraryRepository.updateUsageByUrls).not.toHaveBeenCalledWith(
        brandId,
        [url1],
        false,
        expect.anything()
      );
    });
  });
});
