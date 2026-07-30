const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// 1. Mock Redis client
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  duplicate: jest.fn().mockReturnThis(),
  connect: jest.fn().mockResolvedValue(),
  isOpen: true
};
jest.mock('../../src/config/redis', () => mockRedis);

// 2. Mock BullMQ queues
const mockVideoQueue = {
  add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
  getJob: jest.fn(),
  remove: jest.fn().mockResolvedValue()
};
jest.mock('../../src/queues/video.queue', () => ({
  videoQueue: mockVideoQueue
}));

const mockPublishQueue = {
  add: jest.fn().mockResolvedValue({ id: 'mock-publish-job-id' }),
  remove: jest.fn().mockResolvedValue(),
  getJob: jest.fn().mockResolvedValue(null)
};
jest.mock('../../src/queues/publish.queue', () => ({
  publishQueue: mockPublishQueue,
  upsertPublishJob: jest.fn(),
  removePublishJob: jest.fn(),
  // Mirrors the real safeUpsertPublishJob's active-job check against this
  // mocked queue, so retryFailedPlatforms's #106 guard is still exercised.
  safeUpsertPublishJob: jest.fn(async (jobId, jobName, jobData, jobOpts) => {
    const existing = await mockPublishQueue.getJob(jobId);
    if (existing && (await existing.getState()) === 'active') {
      return { applied: false };
    }
    await mockPublishQueue.remove(jobId);
    await mockPublishQueue.add(jobName, jobData, { ...jobOpts, jobId });
    return { applied: true };
  })
}));

// Mock workers to prevent connection attempts in tests
jest.mock('../../src/queues/video.worker', () => ({}));
jest.mock('../../src/queues/publish.worker', () => ({}));

// 3. Mock Authorization Facade for Brand Access Control
const mockAuthorizationFacade = {
  checkBrandAccess: jest.fn().mockImplementation((userId, brandId) => {
    if (brandId === 'brand_123') return Promise.resolve(true);
    return Promise.resolve(false);
  })
};
jest.mock('../../src/services/auth/authorization.facade', () => mockAuthorizationFacade);

// 4. Mock middlewares
let mockCurrentUser = { id: 'mock-user-id' };
jest.mock('../../src/middlewares/auth.middleware', () => ({
  verifyAuth: (req, res, next) => {
    req.user = mockCurrentUser;
    next();
  }
}));

jest.mock('../../src/middlewares/permission.middleware', () => {
  return () => (req, res, next) => next();
});

jest.mock('../../src/services/workspace/video/video-processor.facade', () => ({
  processVideo: jest.fn().mockResolvedValue('/uploads/media/trimmed-mock.mp4'),
  _resolveFile: jest.fn().mockResolvedValue()
}));

// Mock post repository
const mockPost = {
  id: 'post_123',
  brandId: 'brand_123',
  createdByUserId: 'mock-user-id',
  targetPlatforms: 'YOUTUBE,FACEBOOK',
  platformPostId: null,
  status: 'FAILED'
};
jest.mock('../../src/repositories/workspace/post.repository', () => ({
  findById: jest.fn().mockImplementation((id) => {
    if (id === 'post_123') return Promise.resolve(mockPost);
    return Promise.resolve(null);
  }),
  updateStatus: jest.fn().mockResolvedValue(undefined)
}));

const postRoutes = require('../../src/routes/workspace/post.routes');

describe('Video Editor & Social Publishing Pipeline Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(bodyParser.json());
    // Giả lập middleware gán brandId giống checkBrandAccess để pass phân quyền brand
    app.use((req, res, next) => {
      req.brandId = req.headers['x-brand-id'] || 'brand_123';
      next();
    });
    app.use('/api/posts', postRoutes);

    // Đăng ký Error Handler để trả về JSON khi controller throw error
    app.use((err, req, res, next) => {
      res.status(err.statusCode || err.status || 500).json({ message: err.message });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = { id: 'mock-user-id' };
    mockRedis.get.mockReset();
    mockRedis.set.mockReset();
    mockRedis.del.mockReset();
    mockVideoQueue.add.mockReset();
    mockPublishQueue.add.mockReset();
    mockPublishQueue.remove.mockReset();
    mockAuthorizationFacade.checkBrandAccess.mockClear();
  });

  describe('Asynchronous Video Trimming Pipeline', () => {
    it('POST /api/posts/trim should return 202 Accepted and taskId', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockVideoQueue.add.mockResolvedValue({ id: 'job_123' });

      const res = await request(app)
        .post('/api/posts/trim')
        .send({
          videoUrl: '/uploads/media/original.mp4',
          startTime: 2,
          endTime: 7,
          aspectRatio: '1:1',
          adjustments: { brightness: 10, contrast: 15, saturation: 5 },
          filterPreset: 'grayscale',
          resize: { width: 720, height: 720 },
          brandId: 'brand_123'
        });

      expect(res.status).toBe(202);
      expect(res.body).toHaveProperty('taskId');
      expect(res.body).toHaveProperty('message', 'Video processing started in background');
      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockVideoQueue.add).toHaveBeenCalledWith(
        'process-video',
        expect.objectContaining({
          aspectRatio: '1:1',
          adjustments: { brightness: 10, contrast: 15, saturation: 5 },
          filterPreset: 'grayscale',
          resize: { width: 720, height: 720 }
        }),
        expect.any(Object)
      );
    });

    it('GET /api/posts/trim/:taskId/status should return status & progress (Happy Path)', async () => {
      const taskMetadata = {
        userId: 'mock-user-id',
        status: 'PROCESSING',
        progress: 45
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(taskMetadata));

      const res = await request(app)
        .get('/api/posts/trim/task_123/status');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PROCESSING');
      expect(res.body.progress).toBe(45);
    });

    it('GET /api/posts/trim/:taskId/status should prevent Cross-User data access', async () => {
      const otherUserTask = {
        userId: 'other-user-id',
        status: 'PROCESSING'
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(otherUserTask));

      const res = await request(app)
        .get('/api/posts/trim/task_123/status');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('POST /api/posts/trim should roll back Redis state if enqueue fails', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockVideoQueue.add.mockRejectedValue(new Error('BullMQ Connection Failure'));

      const res = await request(app)
        .post('/api/posts/trim')
        .send({
          videoUrl: '/uploads/media/original.mp4',
          startTime: 2,
          endTime: 7,
          brandId: 'brand_123'
        });

      expect(res.status).toBe(500);
      expect(res.body.message).toContain('BullMQ Connection Failure');
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('POST /api/posts/trim should return 429 Rate Limit WITH taskId on lock contention', async () => {
      mockRedis.set.mockResolvedValue(null); // Lock failed (already locked)

      const res = await request(app)
        .post('/api/posts/trim')
        .send({
          videoUrl: '/uploads/media/original.mp4',
          startTime: 2,
          endTime: 7,
          brandId: 'brand_123'
        });

      expect(res.status).toBe(429);
      expect(res.body).toHaveProperty('taskId');
      expect(res.body.message).toContain('Yêu cầu đang được xử lý');
    });

    it('POST /api/posts/trim should accept saveAudio/keepAudio and pass keepAudio: false to queue', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockVideoQueue.add.mockResolvedValue({ id: 'job_123' });

      const res = await request(app)
        .post('/api/posts/trim')
        .send({
          videoUrl: '/uploads/media/original.mp4',
          startTime: 0,
          endTime: 5,
          saveAudio: false,
          brandId: 'brand_123'
        });

      expect(res.status).toBe(202);
      expect(mockVideoQueue.add).toHaveBeenCalledWith(
        'process-video',
        expect.objectContaining({
          keepAudio: false
        }),
        expect.any(Object)
      );
    });
  });

  describe('Social Publishing & Retry Pipeline', () => {
    it('POST /api/posts/:id/retry-failed should queue retry jobs successfully', async () => {
      mockPublishQueue.remove.mockResolvedValue(true);
      mockPublishQueue.add.mockResolvedValue({ id: 'new-job-id' });

      const res = await request(app)
        .post('/api/posts/post_123/retry-failed')
        .set('x-brand-id', 'brand_123')
        .send({
          platforms: ['YOUTUBE']
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Đã xếp hàng gửi lại bài viết thành công.');
      expect(res.body.platforms).toContain('YOUTUBE');
      expect(mockPublishQueue.remove).toHaveBeenCalledWith('publish-post-post_123');
      expect(mockPublishQueue.add).toHaveBeenCalled();
    });

    it('POST /api/posts/:id/retry-failed should fail if brand ownership is invalid', async () => {
      const res = await request(app)
        .post('/api/posts/post_123/retry-failed')
        .set('x-brand-id', 'wrong_brand')
        .send({
          platforms: ['YOUTUBE']
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied: Unauthorized brand');
    });
  });
});
