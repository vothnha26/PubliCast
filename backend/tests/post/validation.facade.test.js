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

  describe('YouTube Custom Thumbnail Validation', () => {
    beforeEach(() => {
      prisma.platformLimit.findMany.mockResolvedValue([
        {
          platform: 'YOUTUBE',
          subType: 'VIDEO',
          isLocked: false,
          maxCaptionLength: 5000,
          allowedMediaTypes: 'ALL'
        }
      ]);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should pass YouTube validation if no custom thumbnail is provided', async () => {
      const result = await validationFacade.validatePost({
        targetPlatforms: ['YOUTUBE'],
        title: 'Valid YouTube Video',
        options: {
          youtubeType: 'video'
        }
      }, { hasMedia: true, isVideo: true });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass YouTube validation if custom thumbnail is a valid local PNG and size <= 2MB', async () => {
      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'statSync').mockReturnValue({ size: 1.5 * 1024 * 1024 });

      const result = await validationFacade.validatePost({
        targetPlatforms: ['YOUTUBE'],
        title: 'Valid YouTube Video',
        options: {
          youtubeType: 'video',
          youtubeThumbnail: '/uploads/thumb.png'
        }
      }, { hasMedia: true, isVideo: true });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail YouTube validation if custom thumbnail is a local JPG but size > 2MB', async () => {
      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'statSync').mockReturnValue({ size: 2.5 * 1024 * 1024 });

      const result = await validationFacade.validatePost({
        targetPlatforms: ['YOUTUBE'],
        title: 'Valid YouTube Video',
        options: {
          youtubeType: 'video',
          youtubeThumbnail: '/uploads/thumb.jpg'
        }
      }, { hasMedia: true, isVideo: true });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Custom thumbnail size (2.50MB) exceeds YouTube API limit of 2MB');
    });

    it('should fail YouTube validation if custom thumbnail local path has invalid extension', async () => {
      const result = await validationFacade.validatePost({
        targetPlatforms: ['YOUTUBE'],
        title: 'Valid YouTube Video',
        options: {
          youtubeType: 'video',
          youtubeThumbnail: '/uploads/thumb.gif'
        }
      }, { hasMedia: true, isVideo: true });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid Custom thumbnail format. Allowed formats are JPEG and PNG.');
    });

    it('should pass YouTube validation if custom thumbnail URL has valid format and size <= 2MB', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (name) => {
            if (name.toLowerCase() === 'content-length') return String(1 * 1024 * 1024);
            return null;
          }
        }
      });

      const result = await validationFacade.validatePost({
        targetPlatforms: ['YOUTUBE'],
        title: 'Valid YouTube Video',
        options: {
          youtubeType: 'video',
          youtubeThumbnail: 'https://example.com/thumb.jpg'
        }
      }, { hasMedia: true, isVideo: true });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass YouTube validation if custom thumbnail URL has query parameters but valid extension (e.g., .jpg?token=abc)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (name) => {
            if (name.toLowerCase() === 'content-length') return String(1 * 1024 * 1024);
            return null;
          }
        }
      });

      const result = await validationFacade.validatePost({
        targetPlatforms: ['YOUTUBE'],
        title: 'Valid YouTube Video',
        options: {
          youtubeType: 'video',
          youtubeThumbnail: 'https://example.com/thumb.jpg?token=abcdef123&width=800#section'
        }
      }, { hasMedia: true, isVideo: true });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail YouTube validation if custom thumbnail URL size > 2MB', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: {
          get: (name) => {
            if (name.toLowerCase() === 'content-length') return String(3.5 * 1024 * 1024);
            return null;
          }
        }
      });

      const result = await validationFacade.validatePost({
        targetPlatforms: ['YOUTUBE'],
        title: 'Valid YouTube Video',
        options: {
          youtubeType: 'video',
          youtubeThumbnail: 'https://example.com/thumb.png'
        }
      }, { hasMedia: true, isVideo: true });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Custom thumbnail size (3.50MB) exceeds YouTube API limit of 2MB');
    });

    it('should pass YouTube validation if custom thumbnail URL fetch fails (graceful bypass)', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network connection timeout'));

      const result = await validationFacade.validatePost({
        targetPlatforms: ['YOUTUBE'],
        title: 'Valid YouTube Video',
        options: {
          youtubeType: 'video',
          youtubeThumbnail: 'https://example.com/thumb.jpg'
        }
      }, { hasMedia: true, isVideo: true });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
