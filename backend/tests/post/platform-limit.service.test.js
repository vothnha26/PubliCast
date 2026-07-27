const platformLimitService = require('../../src/services/admin/platform-limit.service');
const platformLimitRepository = require('../../src/repositories/admin/platform-limit.repository');

jest.mock('../../src/repositories/admin/platform-limit.repository', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByPlatformAndSubType: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
}));

describe('PlatformLimitService Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockLimits = [
    {
      id: 'limit-1',
      platform: 'YOUTUBE',
      subType: 'VIDEO',
      maxCharacters: 5000,
      maxImages: 0,
      maxVideos: 1,
      allowedMediaTypes: 'VIDEO',
      allowedFormats: 'mp4,mov',
      minVideoDuration: 1,
      maxVideoDuration: 43200,
      maxVideoSize: '137438953472'
    },
    {
      id: 'limit-2',
      platform: 'FACEBOOK',
      subType: 'STORY',
      maxCharacters: 0,
      maxImages: 1,
      maxVideos: 0,
      allowedMediaTypes: 'IMAGE',
      allowedFormats: 'jpg,png',
      minVideoDuration: null,
      maxVideoDuration: null,
      maxVideoSize: null
    }
  ];

  describe('getPlatformLimits', () => {
    it('should return all platform limits from repository', async () => {
      platformLimitRepository.findAll.mockResolvedValue(mockLimits);
      const result = await platformLimitService.getPlatformLimits();
      expect(result).toHaveLength(2);
      expect(result[0].platform).toBe('YOUTUBE');
      expect(platformLimitRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPlatformLimitById', () => {
    it('should return limit by ID', async () => {
      platformLimitRepository.findById.mockResolvedValue(mockLimits[0]);
      const result = await platformLimitService.getPlatformLimitById('limit-1');
      expect(result.id).toBe('limit-1');
      expect(result.subType).toBe('VIDEO');
    });

    it('should throw 404 if limit configuration is not found', async () => {
      platformLimitRepository.findById.mockResolvedValue(null);
      await expect(platformLimitService.getPlatformLimitById('non-existent')).rejects.toThrow('Platform limit config not found');
    });
  });

  describe('createPlatformLimit', () => {
    it('should create limit configuration if platform and subType are unique', async () => {
      platformLimitRepository.findByPlatformAndSubType.mockResolvedValue(null);
      platformLimitRepository.create.mockResolvedValue(mockLimits[0]);

      const newData = { platform: 'YOUTUBE', subType: 'VIDEO', maxCharacters: 5000 };
      const result = await platformLimitService.createPlatformLimit(newData);

      expect(result).toEqual(mockLimits[0]);
      expect(platformLimitRepository.create).toHaveBeenCalledWith(newData);
    });

    it('should throw 400 if platform limit configuration already exists', async () => {
      platformLimitRepository.findByPlatformAndSubType.mockResolvedValue(mockLimits[0]);
      const newData = { platform: 'YOUTUBE', subType: 'VIDEO', maxCharacters: 5000 };
      await expect(platformLimitService.createPlatformLimit(newData)).rejects.toThrow('already exists');
    });
  });

  describe('updatePlatformLimit', () => {
    it('should update platform limit when ID is valid', async () => {
      platformLimitRepository.findById.mockResolvedValue(mockLimits[0]);
      platformLimitRepository.update.mockResolvedValue({ ...mockLimits[0], maxCharacters: 6000 });

      const updateData = { maxCharacters: 6000 };
      const result = await platformLimitService.updatePlatformLimit('limit-1', updateData);

      expect(result.maxCharacters).toBe(6000);
      expect(platformLimitRepository.update).toHaveBeenCalledWith('limit-1', updateData);
    });

    it('should throw 404 if updating non-existent limit', async () => {
      platformLimitRepository.findById.mockResolvedValue(null);
      await expect(platformLimitService.updatePlatformLimit('non-existent', {})).rejects.toThrow('Platform limit config not found');
    });

    it('should throw 400 if updating platform/subType to a conflicting pair', async () => {
      platformLimitRepository.findById.mockResolvedValue(mockLimits[0]);
      platformLimitRepository.findByPlatformAndSubType.mockResolvedValue(mockLimits[1]); // Conflicts with limit-2

      const updateData = { platform: 'FACEBOOK', subType: 'STORY' };
      await expect(platformLimitService.updatePlatformLimit('limit-1', updateData)).rejects.toThrow('already exists');
    });

    it('should reject edits to a locked config with 409 (#82)', async () => {
      platformLimitRepository.findById.mockResolvedValue({ ...mockLimits[0], isLocked: true });

      const updateData = { maxCharacters: 9999 };
      const promise = platformLimitService.updatePlatformLimit('limit-1', updateData);
      await expect(promise).rejects.toThrow('đang bị khóa');
      await expect(promise.catch(e => e.statusCode)).resolves.toBe(409);
      expect(platformLimitRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('toggleLock', () => {
    it('should lock a platform limit when given true', async () => {
      platformLimitRepository.findById.mockResolvedValue(mockLimits[0]);
      platformLimitRepository.update.mockResolvedValue({ ...mockLimits[0], isLocked: true, lockReason: 'Bảo trì' });

      const result = await platformLimitService.toggleLock('limit-1', true, 'Bảo trì');
      expect(result.isLocked).toBe(true);
      expect(result.lockReason).toBe('Bảo trì');
      expect(platformLimitRepository.update).toHaveBeenCalledWith('limit-1', {
        isLocked: true,
        lockReason: 'Bảo trì'
      });
    });

    it('should throw 404 when toggling non-existent limit config', async () => {
      platformLimitRepository.findById.mockResolvedValue(null);
      await expect(platformLimitService.toggleLock('non-existent', true, 'Bảo trì')).rejects.toThrow('Platform limit config not found');
    });
  });

  describe('deletePlatformLimit', () => {
    it('should delete platform limit when config exists', async () => {
      platformLimitRepository.findById.mockResolvedValue(mockLimits[0]);
      platformLimitRepository.delete.mockResolvedValue(mockLimits[0]);

      const result = await platformLimitService.deletePlatformLimit('limit-1');
      expect(result.id).toBe('limit-1');
      expect(platformLimitRepository.delete).toHaveBeenCalledWith('limit-1');
    });

    it('should throw 404 when deleting non-existent limit config', async () => {
      platformLimitRepository.findById.mockResolvedValue(null);
      await expect(platformLimitService.deletePlatformLimit('non-existent')).rejects.toThrow('Platform limit config not found');
    });
  });
});
