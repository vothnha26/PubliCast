jest.mock('../../src/services/social/reddit/reddit.service', () => ({
  getUserSubreddits: jest.fn(),
  searchSubreddits: jest.fn(),
  getSubredditFlairs: jest.fn(),
  publishPost: jest.fn()
}));
jest.mock('../../src/services/social/reddit/reddit.gateway', () => ({
  getAuthUrl: jest.fn()
}));
jest.mock('../../src/repositories/social/social-account.repository', () => ({
  deleteByIdAndBrand: jest.fn(),
  deleteManyByBrandAndPlatform: jest.fn()
}));

const redditService = require('../../src/services/social/reddit/reddit.service');
const redditGateway = require('../../src/services/social/reddit/reddit.gateway');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const redditController = require('../../src/controllers/social/reddit.controller');
const redditControllerV2 = require('../../src/controllers/social/reddit.controller.v2');

function mockReqRes({ query = {}, params = {}, body = {} } = {}) {
  const req = { query, params, body };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res, next: jest.fn() };
}

// v1 methods here are plain (req, res, next) async functions (not wrapped
// in asyncHandler), so — unlike the other controllers in this domain —
// they CAN be awaited directly; kept for symmetry with the other test
// files in this suite regardless.
function callHandler(handler, req, res, next) {
  return new Promise((resolve, reject) => {
    Promise.resolve(handler(req, res, next || ((err) => (err ? reject(err) : resolve())))).then(resolve, reject);
  });
}

describe('RedditController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAuthUrl', () => {
    it('v1 returns {success, url}; v2 wraps the same url in {message, data}', async () => {
      redditGateway.getAuthUrl.mockReturnValue('https://reddit.com/oauth/authorize?mock=1');

      const v1 = mockReqRes({ query: { brandId: 'brand-1' } });
      await callHandler(redditController.getAuthUrl, v1.req, v1.res, v1.next);
      expect(v1.res.json).toHaveBeenCalledWith({ success: true, url: 'https://reddit.com/oauth/authorize?mock=1' });

      const v2 = mockReqRes({ query: { brandId: 'brand-1' } });
      await callHandler(redditControllerV2.getAuthUrl, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Success', data: { url: 'https://reddit.com/oauth/authorize?mock=1' } });
    });

    it('passes a JSON-encoded state containing brandId to the gateway, on both versions', async () => {
      redditGateway.getAuthUrl.mockReturnValue('url');
      const { req, res } = mockReqRes({ query: { brandId: 'brand-1' } });
      await callHandler(redditControllerV2.getAuthUrl, req, res);
      expect(redditGateway.getAuthUrl).toHaveBeenCalledWith(JSON.stringify({ brandId: 'brand-1' }));
    });
  });

  describe('getUserSubreddits', () => {
    it('v1 and v2 both return the same subreddits list', async () => {
      redditService.getUserSubreddits.mockResolvedValue([{ name: 'r/test' }]);

      const v1 = mockReqRes({ query: { brandId: 'brand-1' } });
      await callHandler(redditController.getUserSubreddits, v1.req, v1.res, v1.next);
      expect(v1.res.json).toHaveBeenCalledWith({ success: true, data: [{ name: 'r/test' }] });

      const v2 = mockReqRes({ query: { brandId: 'brand-1' } });
      await callHandler(redditControllerV2.getUserSubreddits, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Success', data: [{ name: 'r/test' }] });
    });
  });

  describe('searchSubreddits', () => {
    it('defaults q to an empty string when omitted, on both versions', async () => {
      redditService.searchSubreddits.mockResolvedValue([]);
      const { req, res } = mockReqRes({ query: { brandId: 'brand-1' } });
      await callHandler(redditControllerV2.searchSubreddits, req, res);
      expect(redditService.searchSubreddits).toHaveBeenCalledWith('brand-1', '');
    });
  });

  describe('getSubredditFlairs', () => {
    it('v1 and v2 both return the same flairs for the given subreddit param', async () => {
      redditService.getSubredditFlairs.mockResolvedValue([{ id: 'flair-1' }]);

      const v1 = mockReqRes({ query: { brandId: 'brand-1' }, params: { subreddit: 'test' } });
      await callHandler(redditController.getSubredditFlairs, v1.req, v1.res, v1.next);
      expect(redditService.getSubredditFlairs).toHaveBeenCalledWith('brand-1', 'test');
      expect(v1.res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 'flair-1' }] });

      const v2 = mockReqRes({ query: { brandId: 'brand-1' }, params: { subreddit: 'test' } });
      await callHandler(redditControllerV2.getSubredditFlairs, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Success', data: [{ id: 'flair-1' }] });
    });
  });

  describe('disconnect', () => {
    it('deletes a specific account when socialAccountId is given, on both versions', async () => {
      const v1 = mockReqRes({ body: { brandId: 'brand-1', socialAccountId: 'acc-1' } });
      await callHandler(redditController.disconnect, v1.req, v1.res, v1.next);
      expect(socialAccountRepository.deleteByIdAndBrand).toHaveBeenCalledWith('brand-1', 'acc-1');
      expect(v1.res.json).toHaveBeenCalledWith({ success: true, message: 'Disconnected Reddit account successfully' });

      jest.clearAllMocks();
      const v2 = mockReqRes({ body: { brandId: 'brand-1', socialAccountId: 'acc-1' } });
      await callHandler(redditControllerV2.disconnect, v2.req, v2.res);
      expect(socialAccountRepository.deleteByIdAndBrand).toHaveBeenCalledWith('brand-1', 'acc-1');
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Disconnected Reddit account successfully', data: null });
    });

    it('deletes all Reddit accounts for the brand when socialAccountId is omitted, on both versions', async () => {
      const v1 = mockReqRes({ body: { brandId: 'brand-1' } });
      await callHandler(redditController.disconnect, v1.req, v1.res, v1.next);
      expect(socialAccountRepository.deleteManyByBrandAndPlatform).toHaveBeenCalledWith('brand-1', 'REDDIT');

      jest.clearAllMocks();
      const v2 = mockReqRes({ body: { brandId: 'brand-1' } });
      await callHandler(redditControllerV2.disconnect, v2.req, v2.res);
      expect(socialAccountRepository.deleteManyByBrandAndPlatform).toHaveBeenCalledWith('brand-1', 'REDDIT');
    });
  });

  describe('submitPost', () => {
    it('v1 and v2 both forward postData (minus brandId) to the service', async () => {
      redditService.publishPost.mockResolvedValue({ id: 'post-1' });

      const v1 = mockReqRes({ body: { brandId: 'brand-1', title: 'Hello', subreddit: 'test' } });
      await callHandler(redditController.submitPost, v1.req, v1.res, v1.next);
      expect(redditService.publishPost).toHaveBeenCalledWith('brand-1', { title: 'Hello', subreddit: 'test' });
      expect(v1.res.json).toHaveBeenCalledWith({ success: true, data: { id: 'post-1' } });

      const v2 = mockReqRes({ body: { brandId: 'brand-1', title: 'Hello', subreddit: 'test' } });
      await callHandler(redditControllerV2.submitPost, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Success', data: { id: 'post-1' } });
    });
  });
});
