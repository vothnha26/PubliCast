/**
 * resolvePostUploadLimits resolves the STRICTEST PlatformLimit across all
 * platforms in ?targetPlatforms= before POST /api/posts/upload accepts a
 * file — multer's own limits.fileSize is a static per-instance ceiling and
 * can't vary per request, so this narrows req.postUploadLimits for
 * postController.uploadVideo to enforce after the real upload completes.
 */
jest.mock('../../src/config/prisma', () => ({
  platformLimit: {
    findMany: jest.fn(),
  },
}));

const prisma = require('../../src/config/prisma');
const resolvePostUploadLimits = require('../../src/middlewares/resolve-post-upload-limits.middleware');

describe('resolvePostUploadLimits middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { query: {} };
    res = {};
    next = jest.fn();
  });

  it('falls back to the schema-default limit when no targetPlatforms query param is given', async () => {
    await resolvePostUploadLimits(req, res, next);

    expect(prisma.platformLimit.findMany).not.toHaveBeenCalled();
    expect(req.postUploadLimits).toEqual({
      maxFileSizeMb: 100,
      allowedFormats: ['mp4', 'mov', 'png', 'jpg', 'jpeg'],
    });
    expect(next).toHaveBeenCalled();
  });

  it('uses the smallest maxFileSizeMb across all requested platforms', async () => {
    req.query.targetPlatforms = 'FACEBOOK,TIKTOK';
    prisma.platformLimit.findMany.mockResolvedValue([
      { platform: 'FACEBOOK', maxFileSizeMb: 4096, allowedFormats: 'mp4,mov' },
      { platform: 'TIKTOK', maxFileSizeMb: 500, allowedFormats: 'mp4,mov' },
    ]);

    await resolvePostUploadLimits(req, res, next);

    expect(req.postUploadLimits.maxFileSizeMb).toBe(500);
    expect(next).toHaveBeenCalled();
  });

  it('intersects allowedFormats — a format must be allowed by every requested platform', async () => {
    req.query.targetPlatforms = 'FACEBOOK,TIKTOK';
    prisma.platformLimit.findMany.mockResolvedValue([
      { platform: 'FACEBOOK', maxFileSizeMb: 4096, allowedFormats: 'mp4,mov,jpg' },
      { platform: 'TIKTOK', maxFileSizeMb: 500, allowedFormats: 'mp4,webm' },
    ]);

    await resolvePostUploadLimits(req, res, next);

    expect(req.postUploadLimits.allowedFormats).toEqual(['mp4']);
  });

  it('is case-insensitive and trims whitespace on the platform list', async () => {
    req.query.targetPlatforms = ' facebook , tiktok ';
    prisma.platformLimit.findMany.mockResolvedValue([
      { platform: 'FACEBOOK', maxFileSizeMb: 4096, allowedFormats: 'mp4' },
    ]);

    await resolvePostUploadLimits(req, res, next);

    expect(prisma.platformLimit.findMany).toHaveBeenCalledWith({
      where: { platform: { in: ['FACEBOOK', 'TIKTOK'] } },
    });
  });

  it('falls back to the schema-default limit when no PlatformLimit rows match', async () => {
    req.query.targetPlatforms = 'BLUESKY';
    prisma.platformLimit.findMany.mockResolvedValue([]);

    await resolvePostUploadLimits(req, res, next);

    expect(req.postUploadLimits).toEqual({
      maxFileSizeMb: 100,
      allowedFormats: ['mp4', 'mov', 'png', 'jpg', 'jpeg'],
    });
    expect(next).toHaveBeenCalled();
  });

  it('fails open to the fallback limit (not open to unlimited) when the DB query throws', async () => {
    req.query.targetPlatforms = 'FACEBOOK';
    prisma.platformLimit.findMany.mockRejectedValue(new Error('DB unreachable'));

    await resolvePostUploadLimits(req, res, next);

    expect(req.postUploadLimits).toEqual({
      maxFileSizeMb: 100,
      allowedFormats: ['mp4', 'mov', 'png', 'jpg', 'jpeg'],
    });
    expect(next).toHaveBeenCalled();
  });
});
