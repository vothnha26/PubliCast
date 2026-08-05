jest.mock('../../src/services/workspace/feed.service', () => ({
  listFeedSources: jest.fn(),
  createCustomFeedSource: jest.fn(),
  deleteFeedSource: jest.fn(),
  getFeedEntries: jest.fn(),
  getCuratedFeeds: jest.fn()
}));

const feedService = require('../../src/services/workspace/feed.service');
const feedController = require('../../src/controllers/workspace/feed.controller');

function mockReqRes({ query = {}, body = {}, params = {} } = {}) {
  const req = { query, body, params, user: { id: 'user-1' } };
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
  controllerMethod(req, res, () => {});
  await done;
}

describe('feed.controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFeedSources', () => {
    it('returns 400 when brandId is missing', async () => {
      const { req, res, done } = mockReqRes({ query: {} });
      await invoke(feedController.getFeedSources, req, res, done);

      expect(res.statusCode).toBe(400);
      expect(feedService.listFeedSources).not.toHaveBeenCalled();
    });

    it('returns feed sources for the brand', async () => {
      feedService.listFeedSources.mockResolvedValue([{ id: 'feed-1' }]);

      const { req, res, done } = mockReqRes({ query: { brandId: 'brand-1' } });
      await invoke(feedController.getFeedSources, req, res, done);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.feedSources).toEqual([{ id: 'feed-1' }]);
    });
  });

  describe('createFeedSource', () => {
    it('returns 400 when required fields are missing', async () => {
      const { req, res, done } = mockReqRes({ body: { brandId: 'brand-1' } });
      await invoke(feedController.createFeedSource, req, res, done);

      expect(res.statusCode).toBe(400);
      expect(feedService.createCustomFeedSource).not.toHaveBeenCalled();
    });

    it('creates the feed source and returns 201', async () => {
      feedService.createCustomFeedSource.mockResolvedValue({ id: 'feed-1' });

      const { req, res, done } = mockReqRes({ body: { brandId: 'brand-1', url: 'https://example.com/rss', name: 'My Feed' } });
      await invoke(feedController.createFeedSource, req, res, done);

      expect(res.statusCode).toBe(201);
      expect(feedService.createCustomFeedSource).toHaveBeenCalledWith('brand-1', {
        name: 'My Feed', url: 'https://example.com/rss', category: undefined
      });
    });

    it('maps a service-level 400 (invalid url) to the response status', async () => {
      const error = new Error('url is required');
      error.status = 400;
      feedService.createCustomFeedSource.mockRejectedValue(error);

      const { req, res, done } = mockReqRes({ body: { brandId: 'brand-1', url: '   ' } });
      await invoke(feedController.createFeedSource, req, res, done);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('url is required');
    });
  });

  describe('deleteFeedSource', () => {
    it('returns 400 when brandId is missing', async () => {
      const { req, res, done } = mockReqRes({ params: { id: 'feed-1' }, query: {} });
      await invoke(feedController.deleteFeedSource, req, res, done);

      expect(res.statusCode).toBe(400);
      expect(feedService.deleteFeedSource).not.toHaveBeenCalled();
    });

    it('maps a service-level 404 to the response status', async () => {
      const error = new Error('Feed source not found');
      error.status = 404;
      feedService.deleteFeedSource.mockRejectedValue(error);

      const { req, res, done } = mockReqRes({ params: { id: 'feed-1' }, query: { brandId: 'brand-1' } });
      await invoke(feedController.deleteFeedSource, req, res, done);

      expect(res.statusCode).toBe(404);
    });

    it('deletes the feed source and returns 200', async () => {
      feedService.deleteFeedSource.mockResolvedValue();

      const { req, res, done } = mockReqRes({ params: { id: 'feed-1' }, query: { brandId: 'brand-1' } });
      await invoke(feedController.deleteFeedSource, req, res, done);

      expect(res.statusCode).toBe(200);
      expect(feedService.deleteFeedSource).toHaveBeenCalledWith('feed-1', 'brand-1');
    });
  });

  describe('getFeedEntries', () => {
    it('returns 400 when brandId is missing', async () => {
      const { req, res, done } = mockReqRes({ query: {} });
      await invoke(feedController.getFeedEntries, req, res, done);

      expect(res.statusCode).toBe(400);
      expect(feedService.getFeedEntries).not.toHaveBeenCalled();
    });

    it('returns entries with a default limit of 50', async () => {
      feedService.getFeedEntries.mockResolvedValue([]);

      const { req, res, done } = mockReqRes({ query: { brandId: 'brand-1' } });
      await invoke(feedController.getFeedEntries, req, res, done);

      expect(res.statusCode).toBe(200);
      expect(feedService.getFeedEntries).toHaveBeenCalledWith('brand-1', { limit: 50 });
    });

    it('caps the limit at 100', async () => {
      feedService.getFeedEntries.mockResolvedValue([]);

      const { req, res, done } = mockReqRes({ query: { brandId: 'brand-1', limit: '5000' } });
      await invoke(feedController.getFeedEntries, req, res, done);

      expect(feedService.getFeedEntries).toHaveBeenCalledWith('brand-1', { limit: 100 });
    });
  });

  describe('getCuratedFeeds', () => {
    it('sets a public Cache-Control header for the CDN', async () => {
      feedService.getCuratedFeeds.mockResolvedValue({ feedSources: [], entries: [] });

      const { req, res, done } = mockReqRes();
      let cacheControlHeader = null;
      res.set = (name, value) => { if (name === 'Cache-Control') cacheControlHeader = value; };
      await invoke(feedController.getCuratedFeeds, req, res, done);

      expect(cacheControlHeader).toBe('public, max-age=1800');
      expect(res.statusCode).toBe(200);
    });

    it('does not require a brandId (same response for every brand)', async () => {
      feedService.getCuratedFeeds.mockResolvedValue({ feedSources: [{ id: 'sys-1' }], entries: [] });

      const { req, res, done } = mockReqRes({ query: {} });
      res.set = () => {};
      await invoke(feedController.getCuratedFeeds, req, res, done);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.feedSources).toEqual([{ id: 'sys-1' }]);
    });
  });
});
