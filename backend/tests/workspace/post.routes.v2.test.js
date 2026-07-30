const express = require('express');
const request = require('supertest');

jest.mock('../../src/services/workspace/post.service', () => ({
  processUploadedFile: jest.fn(),
  getPlatformLimits: jest.fn(),
}));

jest.mock('../../src/middlewares/auth.middleware', () => ({
  verifyAuth: (req, res, next) => {
    req.user = { id: 'user-1' };
    next();
  },
}));

jest.mock('../../src/middlewares/permission.middleware', () => () => (req, res, next) => next());

jest.mock('../../src/middlewares/resolve-post-upload-limits.middleware', () => (req, res, next) => {
  req.postUploadLimits = { maxFileSizeMb: 100, allowedFormats: ['mp4'] };
  next();
});

jest.mock('../../src/middlewares/upload.middleware', () => ({
  uploadForPost: {
    single: () => (req, res, next) => {
      req.file = { path: 'https://cloudinary.example/video.mp4', size: 1024 * 1024, filename: 'abc', format: 'mp4', duration: 12 };
      next();
    },
  },
}));

const postService = require('../../src/services/workspace/post.service');
const postRoutesV2 = require('../../src/routes/workspace/post.routes.v2');

describe('POST /api/v2/posts/upload — response envelope', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/v2/posts', postRoutesV2);
  });

  it('returns { message, data } envelope with the real Cloudinary-reported metadata', async () => {
    postService.processUploadedFile.mockResolvedValue({
      videoUrl: 'https://cloudinary.example/video.mp4',
      sizeMb: 1.0,
      duration: 12,
      format: 'mp4',
    });

    const res = await request(app).post('/api/v2/posts/upload');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: 'Video uploaded successfully',
      data: {
        videoUrl: 'https://cloudinary.example/video.mp4',
        sizeMb: 1.0,
        duration: 12,
        format: 'mp4',
      },
    });
  });

  it('propagates processUploadedFile\'s statusCode (e.g. oversized file) as a 400, not a 500', async () => {
    const err = new Error('File size (600MB) exceeds the 100MB limit for the selected platform(s).');
    err.statusCode = 400;
    postService.processUploadedFile.mockRejectedValue(err);

    app.use((error, req, res, _next) => {
      res.status(error.statusCode || 500).json({ message: error.message });
    });

    const res = await request(app).post('/api/v2/posts/upload');

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/exceeds the 100MB limit/);
  });
});

describe('GET /api/v2/posts/platform-limits — response envelope', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use('/api/v2/posts', postRoutesV2);
  });

  it('returns { message, data } envelope with the full PlatformLimit list', async () => {
    const limits = [
      { platform: 'FACEBOOK', subType: 'POST', maxFileSizeMb: 100, allowedFormats: 'mp4,mov,png,jpg,jpeg' },
      { platform: 'FACEBOOK', subType: 'REEL', maxFileSizeMb: 100, allowedFormats: 'mp4,mov' },
    ];
    postService.getPlatformLimits.mockResolvedValue(limits);

    const res = await request(app).get('/api/v2/posts/platform-limits');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: 'Platform limits retrieved successfully',
      data: limits,
    });
  });
});
