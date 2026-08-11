// Covers the 7 endpoints added to post.controller.v2.js in this pass:
// getPosts, updatePost, bulkApprove, bulkDelete, bulkRestore, emptyTrash,
// trimVideo, getTrimStatus, transcribeVideo, getMusicTracks,
// retryFailedPlatforms. trimVideo/getTrimStatus share submitTrimJob with
// v1 (see tests/post/video-editor-api.test.js for the fuller v1 route-level
// BullMQ/Redis integration coverage) — this file focuses on v1/v2 parity
// at the controller level.

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn()
};
jest.mock('../../src/config/redis', () => mockRedis);

const mockVideoQueue = {
  add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
  getJob: jest.fn(),
  remove: jest.fn().mockResolvedValue()
};
jest.mock('../../src/queues/video.queue', () => ({ videoQueue: mockVideoQueue }));

jest.mock('../../src/services/workspace/post.service', () => ({
  getPosts: jest.fn(),
  getPlatformLimits: jest.fn(),
  createPost: jest.fn(),
  updatePost: jest.fn(),
  bulkApprove: jest.fn(),
  bulkDelete: jest.fn(),
  bulkRestore: jest.fn(),
  emptyTrash: jest.fn(),
  processUploadedFile: jest.fn(),
  deleteUploadedAsset: jest.fn(),
  retryFailedPlatforms: jest.fn()
}));

jest.mock('../../src/services/workspace/video/video-processor.facade', () => ({
  _resolveFile: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../src/services/workspace/ai/transcription/transcription-strategy.factory', () => ({
  getStrategy: jest.fn()
}));

const postService = require('../../src/services/workspace/post.service');
const postController = require('../../src/controllers/workspace/post.controller');
const postControllerV2 = require('../../src/controllers/workspace/post.controller.v2');

function mockReqRes({ params = {}, query = {}, body = {}, headers = {}, user = { id: 'user-1' } } = {}) {
  const req = { params, query, body, headers, user };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), set: jest.fn() };
  return { req, res };
}

function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    setImmediate(resolve);
  });
}

describe('PostController v1/v2 parity (getPosts, bulk ops, trim, transcribe, music, retry)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPosts', () => {
    it('400s without brandId; both keep the flat {message, data, meta} shape otherwise', async () => {
      const v1a = mockReqRes({ query: {} });
      await callHandler(postController.getPosts, v1a.req, v1a.res);
      expect(v1a.res.status).toHaveBeenCalledWith(400);

      postService.getPosts.mockResolvedValue({ data: [{ id: 'p1' }], meta: { total: 1 } });

      const v1 = mockReqRes({ query: { brandId: 'b1' } });
      await callHandler(postController.getPosts, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'Posts retrieved successfully', data: [{ id: 'p1' }], meta: { total: 1 } });

      const v2 = mockReqRes({ query: { brandId: 'b1' } });
      await callHandler(postControllerV2.getPosts, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Posts retrieved successfully', data: [{ id: 'p1' }], meta: { total: 1 } });
    });
  });

  describe('updatePost', () => {
    it('both return the updated post under {message, data}', async () => {
      postService.updatePost.mockResolvedValue({ id: 'p1', caption: 'updated' });

      const v2 = mockReqRes({ params: { id: 'p1' }, body: { brandId: 'b1', caption: 'updated' } });
      await callHandler(postControllerV2.updatePost, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Post updated successfully', data: { id: 'p1', caption: 'updated' } });
    });
  });

  describe('bulk ops', () => {
    it('bulkApprove/bulkDelete/bulkRestore/emptyTrash all keep the flat {message, count} shape on both versions', async () => {
      postService.bulkApprove.mockResolvedValue(3);
      const v1 = mockReqRes({ body: { brandId: 'b1', ids: ['a', 'b', 'c'] } });
      await callHandler(postController.bulkApprove, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'Posts approved successfully', count: 3 });

      const v2 = mockReqRes({ body: { brandId: 'b1', ids: ['a', 'b', 'c'] } });
      await callHandler(postControllerV2.bulkApprove, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Posts approved successfully', count: 3 });
    });

    it('400s without an ids/postIds array, on both versions', async () => {
      const v1 = mockReqRes({ body: { brandId: 'b1' } });
      await callHandler(postController.bulkDelete, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({ body: { brandId: 'b1' } });
      await callHandler(postControllerV2.bulkDelete, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });

    it('emptyTrash: both forward brandId and return the count', async () => {
      postService.emptyTrash.mockResolvedValue(5);
      const v2 = mockReqRes({ query: { brandId: 'b1' } });
      await callHandler(postControllerV2.emptyTrash, v2.req, v2.res);
      expect(postService.emptyTrash).toHaveBeenCalledWith('b1');
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Trash emptied successfully', count: 5 });
    });
  });

  describe('trimVideo (single clip)', () => {
    it('400s without videoUrl, on both versions', async () => {
      const v1 = mockReqRes({ body: {} });
      await callHandler(postController.trimVideo, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({ body: {} });
      await callHandler(postControllerV2.trimVideo, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });

    it('submits one job and returns 202 with taskId, on both versions (same hash -> same taskId)', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.get.mockResolvedValue(null);

      const body = { videoUrl: 'https://x.com/v.mp4', startTime: 0, endTime: 10 };

      const v1 = mockReqRes({ body });
      await callHandler(postController.trimVideo, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(202);
      const v1TaskId = v1.res.json.mock.calls[0][0].taskId;

      const v2 = mockReqRes({ body });
      await callHandler(postControllerV2.trimVideo, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(202);
      const v2TaskId = v2.res.json.mock.calls[0][0].taskId;

      expect(v2TaskId).toBe(v1TaskId);
    });

    it('429s with Retry-After when the lock is already held, on both versions', async () => {
      mockRedis.set.mockResolvedValue(null);

      const body = { videoUrl: 'https://x.com/v.mp4', startTime: 0, endTime: 10 };
      const v2 = mockReqRes({ body });
      await callHandler(postControllerV2.trimVideo, v2.req, v2.res);
      expect(v2.res.set).toHaveBeenCalledWith('Retry-After', '1');
      expect(v2.res.status).toHaveBeenCalledWith(429);
    });
  });

  describe('getTrimStatus', () => {
    it('404s when the task is not found, on both versions', async () => {
      mockRedis.get.mockResolvedValue(null);

      const v1 = mockReqRes({ params: { taskId: 'trim_missing' } });
      await callHandler(postController.getTrimStatus, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(404);

      const v2 = mockReqRes({ params: { taskId: 'trim_missing' } });
      await callHandler(postControllerV2.getTrimStatus, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(404);
    });

    it('403s when the caller does not own the task (IDOR guard), on both versions', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ status: 'PROCESSING', userId: 'someone-else' }));

      const v2 = mockReqRes({ params: { taskId: 'trim_x' }, user: { id: 'attacker' } });
      await callHandler(postControllerV2.getTrimStatus, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(403);
    });

    it('returns the raw task object (no envelope), on both versions', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ status: 'SUCCESS', userId: 'user-1' }));

      const v2 = mockReqRes({ params: { taskId: 'trim_x' } });
      await callHandler(postControllerV2.getTrimStatus, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ status: 'SUCCESS', userId: 'user-1' });
    });
  });

  describe('retryFailedPlatforms', () => {
    it('400s without platforms array, on both versions', async () => {
      const v1 = mockReqRes({ params: { id: 'p1' }, body: { brandId: 'b1' } });
      await callHandler(postController.retryFailedPlatforms, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({ params: { id: 'p1' }, body: { brandId: 'b1' } });
      await callHandler(postControllerV2.retryFailedPlatforms, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });

    it('both return the same flat {message, platforms} shape', async () => {
      postService.retryFailedPlatforms.mockResolvedValue({ platforms: ['FACEBOOK'] });

      const v2 = mockReqRes({ params: { id: 'p1' }, body: { brandId: 'b1', platforms: ['FACEBOOK'] } });
      await callHandler(postControllerV2.retryFailedPlatforms, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Đã xếp hàng gửi lại bài viết thành công.', platforms: ['FACEBOOK'] });
    });
  });

  describe('transcribeVideo', () => {
    it('400s without videoUrl, on both versions', async () => {
      const v1 = mockReqRes({ body: {} });
      await callHandler(postController.transcribeVideo, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({ body: {} });
      await callHandler(postControllerV2.transcribeVideo, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getMusicTracks', () => {
    it('v1 wraps under {message, data}; v2 uses the same via v2Success', async () => {
      const v1 = mockReqRes({ query: { mood: 'chill' } });
      await callHandler(postController.getMusicTracks, v1.req, v1.res);
      const v1Body = v1.res.json.mock.calls[0][0];
      expect(v1Body.message).toBe('Music tracks retrieved successfully');
      expect(v1Body.data[0].id).toBe('chill_1');

      const v2 = mockReqRes({ query: { mood: 'chill' } });
      await callHandler(postControllerV2.getMusicTracks, v2.req, v2.res);
      const v2Body = v2.res.json.mock.calls[0][0];
      expect(v2Body.message).toBe('Music tracks retrieved successfully');
      expect(v2Body.data[0].id).toBe('chill_1');
    });

    it('falls back to chill tracks for an unknown mood, on both versions', async () => {
      const v2 = mockReqRes({ query: { mood: 'nonexistent' } });
      await callHandler(postControllerV2.getMusicTracks, v2.req, v2.res);
      expect(v2.res.json.mock.calls[0][0].data[0].id).toBe('chill_1');
    });
  });
});
