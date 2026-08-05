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
  refreshFeedSource: jest.fn().mockResolvedValue({ added: 0 })
}));

const prisma = require('../../src/config/prisma');
const feedController = require('../../src/controllers/admin/feed.controller');

function mockReqRes({ body = {}, params = {} } = {}) {
  const req = { body, params, user: { id: 'admin-1' } };
  let resolveDone;
  const done = new Promise((resolve) => { resolveDone = resolve; });
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; resolveDone(); return this; }
  };
  return { req, res, done };
}

async function invoke(controllerMethod, req, res, done) {
  await controllerMethod(req, res, () => {});
  await done;
}

describe('admin/feed.controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSystemFeeds', () => {
    it('only returns feeds flagged isSystem', async () => {
      prisma.feedSource.findMany.mockResolvedValue([]);

      const { req, res, done } = mockReqRes();
      await invoke(feedController.getSystemFeeds, req, res, done);

      expect(prisma.feedSource.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { isSystem: true }
      }));
      expect(res.statusCode).toBe(200);
    });
  });

  describe('createSystemFeed', () => {
    it('returns 400 when name or url is missing', async () => {
      const { req, res, done } = mockReqRes({ body: { name: 'Tech News' } });
      await invoke(feedController.createSystemFeed, req, res, done);

      expect(res.statusCode).toBe(400);
      expect(prisma.feedSource.create).not.toHaveBeenCalled();
    });

    it('creates a system feed with brandId null and isSystem true', async () => {
      prisma.feedSource.create.mockResolvedValue({ id: 'feed-1', isSystem: true });

      const { req, res, done } = mockReqRes({ body: { name: 'Tech News', url: 'https://example.com/rss', category: 'Tech' } });
      await invoke(feedController.createSystemFeed, req, res, done);

      expect(prisma.feedSource.create).toHaveBeenCalledWith({
        data: { brandId: null, name: 'Tech News', url: 'https://example.com/rss', category: 'Tech', isSystem: true }
      });
      expect(res.statusCode).toBe(201);
    });
  });

  describe('updateSystemFeed', () => {
    it('returns 404 when the feed is not a system feed', async () => {
      prisma.feedSource.findUnique.mockResolvedValue({ id: 'feed-1', isSystem: false, brandId: 'brand-1' });

      const { req, res, done } = mockReqRes({ params: { id: 'feed-1' }, body: { name: 'New Name' } });
      await invoke(feedController.updateSystemFeed, req, res, done);

      expect(res.statusCode).toBe(404);
      expect(prisma.feedSource.update).not.toHaveBeenCalled();
    });

    it('updates only the provided fields', async () => {
      prisma.feedSource.findUnique.mockResolvedValue({ id: 'feed-1', isSystem: true });
      prisma.feedSource.update.mockResolvedValue({ id: 'feed-1', name: 'New Name' });

      const { req, res, done } = mockReqRes({ params: { id: 'feed-1' }, body: { name: 'New Name' } });
      await invoke(feedController.updateSystemFeed, req, res, done);

      expect(prisma.feedSource.update).toHaveBeenCalledWith({ where: { id: 'feed-1' }, data: { name: 'New Name' } });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('deleteSystemFeed', () => {
    it('returns 404 when the feed is not a system feed (cannot delete a brand\'s custom feed via admin route)', async () => {
      prisma.feedSource.findUnique.mockResolvedValue({ id: 'feed-1', isSystem: false, brandId: 'brand-1' });

      const { req, res, done } = mockReqRes({ params: { id: 'feed-1' } });
      await invoke(feedController.deleteSystemFeed, req, res, done);

      expect(res.statusCode).toBe(404);
      expect(prisma.feedSource.delete).not.toHaveBeenCalled();
    });

    it('deletes the system feed', async () => {
      prisma.feedSource.findUnique.mockResolvedValue({ id: 'feed-1', isSystem: true });

      const { req, res, done } = mockReqRes({ params: { id: 'feed-1' } });
      await invoke(feedController.deleteSystemFeed, req, res, done);

      expect(prisma.feedSource.delete).toHaveBeenCalledWith({ where: { id: 'feed-1' } });
      expect(res.statusCode).toBe(200);
    });
  });
});
