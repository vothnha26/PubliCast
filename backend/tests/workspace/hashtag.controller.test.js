jest.mock('../../src/config/prisma', () => ({
  hashtagSet: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  hashtagTracker: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() }
}));
jest.mock('../../src/services/workspace/hashtag/trending/TrendingHashtagService', () => ({
  getTrendingHashtags: jest.fn()
}));
jest.mock('../../src/services/workspace/hashtag/tokapi-hashtag.provider', () => ({
  searchHashtag: jest.fn()
}));
jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkBrandAccess: jest.fn().mockResolvedValue(true)
}));

const prisma = require('../../src/config/prisma');
const trendingHashtagService = require('../../src/services/workspace/hashtag/trending/TrendingHashtagService');
const hashtagController = require('../../src/controllers/workspace/hashtag.controller');
const hashtagControllerV2 = require('../../src/controllers/workspace/hashtag.controller.v2');

function mockReqRes({ params = {}, query = {}, body = {}, user = { id: 'user-1' } } = {}) {
  const req = { params, query, body, user };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

// v1 methods here are plain (req, res, next) async functions with manual
// try/catch (not asyncHandler); v2 wraps in asyncHandler. Both can be
// awaited via this indirection.
function callHandler(handler, req, res, next) {
  return new Promise((resolve, reject) => {
    Promise.resolve(handler(req, res, next || ((err) => (err ? reject(err) : resolve())))).then(resolve, reject);
  });
}

describe('HashtagController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHashtagData', () => {
    it('v1 and v2 both return the bare { sets, trackers } shape', async () => {
      prisma.hashtagSet.findMany.mockResolvedValue([{ id: 's1' }]);
      prisma.hashtagTracker.findMany.mockResolvedValue([{ id: 't1' }]);

      const v1 = mockReqRes({ query: { brandId: 'b1' } });
      await callHandler(hashtagController.getHashtagData, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ sets: [{ id: 's1' }], trackers: [{ id: 't1' }] });

      const v2 = mockReqRes({ query: { brandId: 'b1' } });
      await callHandler(hashtagControllerV2.getHashtagData, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ sets: [{ id: 's1' }], trackers: [{ id: 't1' }] });
    });
  });

  describe('createHashtagSet', () => {
    it('400s when required fields are missing, on both versions', async () => {
      const v1 = mockReqRes({ body: {} });
      await callHandler(hashtagController.createHashtagSet, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({ body: {} });
      await callHandler(hashtagControllerV2.createHashtagSet, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });

    it('both return 201 with the new set', async () => {
      prisma.hashtagSet.create.mockResolvedValue({ id: 's1', name: 'Launch' });

      const v2 = mockReqRes({ body: { brandId: 'b1', name: 'Launch', hashtags: ['#a'] } });
      await callHandler(hashtagControllerV2.createHashtagSet, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(201);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Hashtag set created successfully', data: { id: 's1', name: 'Launch' } });
    });
  });

  describe('trackHashtag', () => {
    it('409s when the hashtag is already tracked, on both versions', async () => {
      prisma.hashtagTracker.findUnique.mockResolvedValue({ id: 'existing' });

      const v1 = mockReqRes({ body: { brandId: 'b1', hashtag: 'test', platform: 'TIKTOK' } });
      await callHandler(hashtagController.trackHashtag, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(409);

      const v2 = mockReqRes({ body: { brandId: 'b1', hashtag: 'test', platform: 'TIKTOK' } });
      await callHandler(hashtagControllerV2.trackHashtag, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('getTrendingHashtags', () => {
    it('v1 and v2 both return the bare { trending } shape', async () => {
      trendingHashtagService.getTrendingHashtags.mockResolvedValue([{ tag: '#viral' }]);

      const v1 = mockReqRes({ query: {} });
      await callHandler(hashtagController.getTrendingHashtags, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ trending: [{ tag: '#viral' }] });

      const v2 = mockReqRes({ query: {} });
      await callHandler(hashtagControllerV2.getTrendingHashtags, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ trending: [{ tag: '#viral' }] });
    });
  });
});
