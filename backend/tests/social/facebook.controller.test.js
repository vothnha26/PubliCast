jest.mock('../../src/services/social/facebook', () => ({
  getPublishedVideos: jest.fn(),
  searchChannel: jest.fn(),
  addCompetitor: jest.fn(),
  getCompetitors: jest.fn(),
  deleteCompetitor: jest.fn(),
  checkReelCopyrightStatus: jest.fn()
}));
jest.mock('../../src/repositories/workspace/brand.repository', () => ({
  userCanAccessBrand: jest.fn()
}));

const facebookService = require('../../src/services/social/facebook');
const brandRepository = require('../../src/repositories/workspace/brand.repository');
const facebookController = require('../../src/controllers/social/facebook.controller');
const facebookControllerV2 = require('../../src/controllers/social/facebook.controller.v2');

function mockReqRes({ query = {}, params = {}, body = {}, user = { id: 'user-1' } } = {}) {
  const req = { query, params, body, user };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() };
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

describe('FacebookController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFacebookPublishedPosts', () => {
    it('v1 returns the service result directly (no envelope)', async () => {
      facebookService.getPublishedVideos.mockResolvedValue({ data: [{ id: 'p1' }], nextPageToken: null });
      const { req, res } = mockReqRes({ query: { brandId: 'brand-1' } });
      await callHandler(facebookController.getFacebookPublishedPosts, req, res);
      expect(res.json).toHaveBeenCalledWith({ data: [{ id: 'p1' }], nextPageToken: null });
    });

    it('v2 wraps the same result in {message, data}', async () => {
      facebookService.getPublishedVideos.mockResolvedValue({ data: [{ id: 'p1' }], nextPageToken: null });
      const { req, res } = mockReqRes({ query: { brandId: 'brand-1' } });
      await callHandler(facebookControllerV2.getFacebookPublishedPosts, req, res);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Success',
        data: { data: [{ id: 'p1' }], nextPageToken: null }
      });
    });

    it('forwards query params identically on both versions', async () => {
      facebookService.getPublishedVideos.mockResolvedValue({});
      const { req, res } = mockReqRes({
        query: { brandId: 'brand-1', pageToken: 'tok', limit: '5', socialAccountId: 'acc-1', startDate: '2026-01-01', endDate: '2026-01-31' }
      });
      await callHandler(facebookControllerV2.getFacebookPublishedPosts, req, res);
      expect(facebookService.getPublishedVideos).toHaveBeenCalledWith('brand-1', 'tok', 5, 'acc-1', '2026-01-01', '2026-01-31');
    });

    it('400s without brandId on both versions', async () => {
      const v1 = mockReqRes({});
      await callHandler(facebookController.getFacebookPublishedPosts, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({});
      await callHandler(facebookControllerV2.getFacebookPublishedPosts, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('searchFacebookPages', () => {
    it('v1 and v2 both return the same pages list', async () => {
      facebookService.searchChannel.mockResolvedValue([{ id: 'page-1' }]);
      const v1 = mockReqRes({ query: { brandId: 'brand-1', query: 'acme' } });
      await callHandler(facebookController.searchFacebookPages, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ data: [{ id: 'page-1' }] });

      const v2 = mockReqRes({ query: { brandId: 'brand-1', query: 'acme' } });
      await callHandler(facebookControllerV2.searchFacebookPages, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Success', data: [{ id: 'page-1' }] });
    });
  });

  describe('addFacebookCompetitor', () => {
    it('v2 returns 201 with the created competitor, matching v1 status code', async () => {
      facebookService.addCompetitor.mockResolvedValue({ id: 'comp-1' });
      const v1 = mockReqRes({ body: { brandId: 'brand-1', pageId: 'page-1' } });
      await callHandler(facebookController.addFacebookCompetitor, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(201);

      const v2 = mockReqRes({ body: { brandId: 'brand-1', pageId: 'page-1' } });
      await callHandler(facebookControllerV2.addFacebookCompetitor, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(201);
      expect(v2.res.json).toHaveBeenCalledWith({
        message: 'Competitor added successfully',
        data: { id: 'comp-1' }
      });
    });
  });

  describe('deleteFacebookCompetitor', () => {
    it('v1 and v2 both call deleteCompetitor and confirm deletion', async () => {
      facebookService.deleteCompetitor.mockResolvedValue(undefined);
      const v1 = mockReqRes({ params: { id: 'comp-1' }, query: { brandId: 'brand-1' } });
      await callHandler(facebookController.deleteFacebookCompetitor, v1.req, v1.res);
      expect(facebookService.deleteCompetitor).toHaveBeenCalledWith('comp-1', 'brand-1', 'user-1');
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'Competitor deleted successfully' });

      const v2 = mockReqRes({ params: { id: 'comp-1' }, query: { brandId: 'brand-1' } });
      await callHandler(facebookControllerV2.deleteFacebookCompetitor, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Competitor deleted successfully', data: null });
    });
  });

  describe('checkFacebookReelCopyright', () => {
    it('v1 and v2 both 403 when the user cannot access the brand', async () => {
      brandRepository.userCanAccessBrand.mockResolvedValue(false);

      const v1 = mockReqRes({ params: { videoId: 'vid-1' }, query: { brandId: 'brand-1' } });
      await callHandler(facebookController.checkFacebookReelCopyright, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(403);

      const v2 = mockReqRes({ params: { videoId: 'vid-1' }, query: { brandId: 'brand-1' } });
      await callHandler(facebookControllerV2.checkFacebookReelCopyright, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(403);
    });

    it('v1 and v2 both return the copyright status on success', async () => {
      brandRepository.userCanAccessBrand.mockResolvedValue(true);
      facebookService.checkReelCopyrightStatus.mockResolvedValue({ status: 'CLEAR' });

      const v1 = mockReqRes({ params: { videoId: 'vid-1' }, query: { brandId: 'brand-1' } });
      await callHandler(facebookController.checkFacebookReelCopyright, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ data: { status: 'CLEAR' } });

      const v2 = mockReqRes({ params: { videoId: 'vid-1' }, query: { brandId: 'brand-1' } });
      await callHandler(facebookControllerV2.checkFacebookReelCopyright, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Success', data: { status: 'CLEAR' } });
    });

    it('v1 and v2 both return a FLAT 429 body with retryAfterSeconds at the top level (frontend contract — not nested under `errors`)', async () => {
      brandRepository.userCanAccessBrand.mockResolvedValue(true);
      const rateLimitError = new Error('Rate limited by Facebook');
      rateLimitError.name = 'FacebookRateLimitError';
      rateLimitError.retryAfterSeconds = 30;
      facebookService.checkReelCopyrightStatus.mockRejectedValue(rateLimitError);

      const v1 = mockReqRes({ params: { videoId: 'vid-1' }, query: { brandId: 'brand-1' } });
      await callHandler(facebookController.checkFacebookReelCopyright, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(429);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'Rate limited by Facebook', retryAfterSeconds: 30 });
      expect(v1.res.setHeader).toHaveBeenCalledWith('Retry-After', '30');

      const v2 = mockReqRes({ params: { videoId: 'vid-1' }, query: { brandId: 'brand-1' } });
      await callHandler(facebookControllerV2.checkFacebookReelCopyright, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(429);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Rate limited by Facebook', retryAfterSeconds: 30 });
    });
  });
});
