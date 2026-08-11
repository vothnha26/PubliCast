jest.mock('../../src/services/social/threads', () => ({
  getPublishedVideos: jest.fn()
}));

const threadsService = require('../../src/services/social/threads');
const threadsController = require('../../src/controllers/social/threads.controller');
const threadsControllerV2 = require('../../src/controllers/social/threads.controller.v2');

function mockReqRes(query = {}) {
  const req = { query };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

// See tests/social/oauth.controller.test.js for why this indirection is
// needed — asyncHandler's (req, res, next) shape doesn't return a Promise
// the caller can await directly.
function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    setImmediate(resolve);
  });
}

describe('ThreadsController (social/threads.controller.js) v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getThreadsPublishedPosts', () => {
    it('v1 returns the service result directly (no envelope)', async () => {
      threadsService.getPublishedVideos.mockResolvedValue({ data: [{ id: 't1' }] });
      const { req, res } = mockReqRes({ brandId: 'brand-1' });
      await callHandler(threadsController.getThreadsPublishedPosts, req, res);
      expect(res.json).toHaveBeenCalledWith({ data: [{ id: 't1' }] });
    });

    it('v2 wraps the same result in {message, data}', async () => {
      threadsService.getPublishedVideos.mockResolvedValue({ data: [{ id: 't1' }] });
      const { req, res } = mockReqRes({ brandId: 'brand-1' });
      await callHandler(threadsControllerV2.getThreadsPublishedPosts, req, res);
      expect(res.json).toHaveBeenCalledWith({ message: 'Success', data: { data: [{ id: 't1' }] } });
    });

    it('forwards query params identically on both versions', async () => {
      threadsService.getPublishedVideos.mockResolvedValue({});
      const { req, res } = mockReqRes({ brandId: 'brand-1', pageToken: 'tok', limit: '5', socialAccountId: 'acc-1', startDate: '2026-01-01', endDate: '2026-01-31' });
      await callHandler(threadsControllerV2.getThreadsPublishedPosts, req, res);
      expect(threadsService.getPublishedVideos).toHaveBeenCalledWith('brand-1', 'tok', 5, 'acc-1', '2026-01-01', '2026-01-31');
    });

    it('400s without brandId on both versions', async () => {
      const v1 = mockReqRes({});
      await callHandler(threadsController.getThreadsPublishedPosts, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({});
      await callHandler(threadsControllerV2.getThreadsPublishedPosts, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });
  });
});
