const validationFacade = require('../../src/services/workspace/post/validators/validation.facade');
const prisma = require('../../src/config/prisma');

jest.mock('../../src/config/prisma', () => ({
  platformLimit: {
    findMany: jest.fn()
  }
}));

describe('ValidationFacade Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return isValid true when no platforms are targetted', async () => {
    const result = await validationFacade.validatePost({
      targetPlatforms: []
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail validation if target platform is locked', async () => {
    prisma.platformLimit.findMany.mockResolvedValue([
      {
        platform: 'FACEBOOK',
        subType: 'POST',
        isLocked: true,
        lockReason: 'Facebook API maintenance'
      }
    ]);

    const result = await validationFacade.validatePost({
      targetPlatforms: ['FACEBOOK'],
      caption: 'Test caption'
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Nền tảng này hiện đang bị khóa');
    expect(result.errors[0]).toContain('Facebook API maintenance');
  });

  it('should pass validation if platform is not locked and limits are respected', async () => {
    prisma.platformLimit.findMany.mockResolvedValue([
      {
        platform: 'FACEBOOK',
        subType: 'POST',
        isLocked: false,
        maxCaptionLength: 2000,
        allowedMediaTypes: 'ALL'
      }
    ]);

    const result = await validationFacade.validatePost({
      targetPlatforms: ['FACEBOOK'],
      caption: 'Valid caption'
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail validation if videoSettings trim values are invalid', async () => {
    prisma.platformLimit.findMany.mockResolvedValue([
      {
        platform: 'INSTAGRAM',
        subType: 'POST',
        isLocked: false,
        maxCaptionLength: 2000,
        allowedMediaTypes: 'ALL'
      }
    ]);

    const result = await validationFacade.validatePost({
      targetPlatforms: ['INSTAGRAM'],
      caption: 'Valid caption',
      options: {
        videoSettings: {
          startTime: 10,
          endTime: 5
        }
      }
    }, { hasMedia: true, isVideo: true });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Thời gian bắt đầu cắt video phải nhỏ hơn thời gian kết thúc');
  });

  it('should fail validation if videoSettings audioVolume is out of bounds', async () => {
    prisma.platformLimit.findMany.mockResolvedValue([
      {
        platform: 'INSTAGRAM',
        subType: 'POST',
        isLocked: false,
        maxCaptionLength: 2000,
        allowedMediaTypes: 'ALL'
      }
    ]);

    const result = await validationFacade.validatePost({
      targetPlatforms: ['INSTAGRAM'],
      caption: 'Valid caption',
      options: {
        videoSettings: {
          audioVolume: 150
        }
      }
    }, { hasMedia: true, isVideo: true });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Âm lượng nhạc nền phải nằm trong khoảng từ 0 đến 100');
  });

  it('should fail validation if Instagram Reels aspect ratio is horizontal (16:9)', async () => {
    prisma.platformLimit.findMany.mockResolvedValue([
      {
        platform: 'INSTAGRAM',
        subType: 'REEL',
        isLocked: false,
        maxCaptionLength: 2000,
        allowedMediaTypes: 'ALL'
      }
    ]);

    const result = await validationFacade.validatePost({
      targetPlatforms: ['INSTAGRAM'],
      caption: 'Valid caption',
      options: {
        instagramType: 'reel',
        videoSettings: {
          aspectRatio: '16:9'
        }
      }
    }, { hasMedia: true, isVideo: true });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Instagram Reels không hỗ trợ tỷ lệ khung hình ngang 16:9');
  });

  it('should pass validation if Instagram Reels aspect ratio is vertical (9:16)', async () => {
    prisma.platformLimit.findMany.mockResolvedValue([
      {
        platform: 'INSTAGRAM',
        subType: 'REEL',
        isLocked: false,
        maxCaptionLength: 2000,
        allowedMediaTypes: 'ALL'
      }
    ]);

    const result = await validationFacade.validatePost({
      targetPlatforms: ['INSTAGRAM'],
      caption: 'Valid caption',
      options: {
        instagramType: 'reel',
        videoSettings: {
          aspectRatio: '9:16'
        }
      }
    }, { hasMedia: true, isVideo: true });

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
