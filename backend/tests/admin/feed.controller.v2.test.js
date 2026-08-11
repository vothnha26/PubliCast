jest.mock('../../src/config/prisma', () => ({
  feedSource: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));
jest.mock('../../src/services/workspace/feed.service', () => ({
  refreshFeedSource: jest.fn().mockResolvedValue(undefined),
  _purgeCuratedFeedsCache: jest.fn().mockResolvedValue(undefined)
}));

const prisma = require('../../src/config/prisma');
const feedController = require('../../src/controllers/admin/feed.controller');
const feedControllerV2 = require('../../src/controllers/admin/feed.controller.v2');

function mockReqRes({ params = {}, body = {} } = {}) {
  const req = { params, body };
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

describe('AdminFeedController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSystemFeeds', () => {
    it('v1 and v2 both wrap results under { feedSources }', async () => {
      prisma.feedSource.findMany.mockResolvedValue([{ id: 'f1' }]);

      const v1 = mockReqRes();
      await callHandler(feedController.getSystemFeeds, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'System feeds retrieved successfully', data: { feedSources: [{ id: 'f1' }] } });

      const v2 = mockReqRes();
      await callHandler(feedControllerV2.getSystemFeeds, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'System feeds retrieved successfully', data: { feedSources: [{ id: 'f1' }] } });
    });
  });

  describe('createSystemFeed', () => {
    it('400s when name or url missing, on both versions', async () => {
      const v1 = mockReqRes({ body: { name: '' } });
      await callHandler(feedController.createSystemFeed, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({ body: { name: '' } });
      await callHandler(feedControllerV2.createSystemFeed, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });

    it('creates and returns 201 with the feed on v2', async () => {
      prisma.feedSource.create.mockResolvedValue({ id: 'f1', name: 'Tech', url: 'https://x.com' });

      const v2 = mockReqRes({ body: { name: 'Tech', url: 'https://x.com' } });
      await callHandler(feedControllerV2.createSystemFeed, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(201);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'System feed created successfully', data: { id: 'f1', name: 'Tech', url: 'https://x.com' } });
    });
  });

  describe('updateSystemFeed / deleteSystemFeed', () => {
    it('404s when the feed does not exist or is not a system feed, on both versions', async () => {
      prisma.feedSource.findUnique.mockResolvedValue(null);

      const v1 = mockReqRes({ params: { id: 'missing' }, body: {} });
      await callHandler(feedController.updateSystemFeed, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(404);

      const v2 = mockReqRes({ params: { id: 'missing' }, body: {} });
      await callHandler(feedControllerV2.updateSystemFeed, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(404);
    });

    it('deletes and returns null data on v2 (v1 omits data entirely)', async () => {
      prisma.feedSource.findUnique.mockResolvedValue({ id: 'f1', isSystem: true });
      prisma.feedSource.delete.mockResolvedValue({});

      const v2 = mockReqRes({ params: { id: 'f1' } });
      await callHandler(feedControllerV2.deleteSystemFeed, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'System feed deleted successfully', data: null });
    });
  });
});
