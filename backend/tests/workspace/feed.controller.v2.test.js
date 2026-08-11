jest.mock('../../src/services/workspace/feed.service', () => ({
  listFeedSources: jest.fn(),
  createCustomFeedSource: jest.fn(),
  deleteFeedSource: jest.fn(),
  getFeedEntries: jest.fn(),
  getCuratedFeeds: jest.fn()
}));

const feedService = require('../../src/services/workspace/feed.service');
const feedController = require('../../src/controllers/workspace/feed.controller');
const feedControllerV2 = require('../../src/controllers/workspace/feed.controller.v2');

function mockReqRes({ query = {}, body = {}, params = {} } = {}) {
  const req = { query, body, params, user: { id: 'user-1' } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), set: jest.fn() };
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

describe('workspace/FeedController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getFeedSources: v1 and v2 both wrap results under { feedSources }', async () => {
    feedService.listFeedSources.mockResolvedValue([{ id: 'feed-1' }]);

    const v1 = mockReqRes({ query: { brandId: 'brand-1' } });
    await callHandler(feedController.getFeedSources, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ message: 'Feed sources retrieved successfully', data: { feedSources: [{ id: 'feed-1' }] } });

    const v2 = mockReqRes({ query: { brandId: 'brand-1' } });
    await callHandler(feedControllerV2.getFeedSources, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Feed sources retrieved successfully', data: { feedSources: [{ id: 'feed-1' }] } });
  });

  it('createFeedSource: a service-level error.status is forwarded to next(err) for the global error handler to map, same as v1', async () => {
    const error = new Error('url is required');
    error.status = 400;
    feedService.createCustomFeedSource.mockRejectedValue(error);

    const v2 = mockReqRes({ body: { brandId: 'brand-1', url: '   ' } });
    const next = jest.fn();
    await new Promise((resolve) => {
      feedControllerV2.createFeedSource(v2.req, v2.res, (err) => { next(err); resolve(); });
    });
    expect(next).toHaveBeenCalledWith(error);
  });

  it('getCuratedFeeds: sets the same public Cache-Control header on both versions', async () => {
    feedService.getCuratedFeeds.mockResolvedValue({ feedSources: [{ id: 'sys-1' }], entries: [] });

    const v2 = mockReqRes();
    await callHandler(feedControllerV2.getCuratedFeeds, v2.req, v2.res);
    expect(v2.res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=1800');
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Curated feeds retrieved successfully', data: { feedSources: [{ id: 'sys-1' }], entries: [] } });
  });

  it('getFeedEntries: caps the limit at 100 on both versions', async () => {
    feedService.getFeedEntries.mockResolvedValue([]);

    const v2 = mockReqRes({ query: { brandId: 'brand-1', limit: '5000' } });
    await callHandler(feedControllerV2.getFeedEntries, v2.req, v2.res);
    expect(feedService.getFeedEntries).toHaveBeenCalledWith('brand-1', { limit: 100 });
  });
});
