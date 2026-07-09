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
});
