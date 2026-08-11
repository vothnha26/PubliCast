jest.mock('../../src/services/workspace/smart-link.service', () => ({
  getSmartLinkByBrand: jest.fn(),
  getAllByBrand: jest.fn(),
  getById: jest.fn(),
  cloneSmartLink: jest.fn(),
  deleteSmartLink: jest.fn(),
  createSmartLink: jest.fn(),
  updateSmartLink: jest.fn(),
  getAnalytics: jest.fn(),
  getPublicSmartLinkBySlug: jest.fn()
}));
jest.mock('../../src/services/workspace/smart-link-analytics.service', () => ({
  trackPageView: jest.fn().mockResolvedValue(undefined),
  trackLinkClick: jest.fn()
}));

const smartLinkService = require('../../src/services/workspace/smart-link.service');
const smartLinkAnalyticsService = require('../../src/services/workspace/smart-link-analytics.service');
const smartLinkController = require('../../src/controllers/workspace/smart-link.controller');
const smartLinkControllerV2 = require('../../src/controllers/workspace/smart-link.controller.v2');

function mockReqRes({ params = {}, query = {}, body = {}, ip = '127.0.0.1', headers = {} } = {}) {
  const req = { params, query, body, ip, headers, method: 'POST' };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), sendStatus: jest.fn(), redirect: jest.fn() };
  return { req, res };
}

function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    setImmediate(resolve);
  });
}

describe('SmartLinkController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSmartLink / listSmartLinks', () => {
    it('400s without brandId, on both versions', async () => {
      const v1 = mockReqRes({ query: {} });
      await callHandler(smartLinkController.getSmartLink, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({ query: {} });
      await callHandler(smartLinkControllerV2.getSmartLink, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });

    it('both return the same smart link', async () => {
      smartLinkService.getSmartLinkByBrand.mockResolvedValue({ id: 'sl1' });

      const v1 = mockReqRes({ query: { brandId: 'b1' } });
      await callHandler(smartLinkController.getSmartLink, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'SmartLink retrieved successfully', data: { id: 'sl1' } });

      const v2 = mockReqRes({ query: { brandId: 'b1' } });
      await callHandler(smartLinkControllerV2.getSmartLink, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'SmartLink retrieved successfully', data: { id: 'sl1' } });
    });
  });

  describe('createSmartLink / cloneSmartLink', () => {
    it('both return 201', async () => {
      smartLinkService.createSmartLink.mockResolvedValue({ id: 'sl1' });
      const v2 = mockReqRes({ body: { brandId: 'b1', slug: 'my-link' } });
      await callHandler(smartLinkControllerV2.createSmartLink, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('deleteSmartLink', () => {
    it('v1 omits data; v2 returns data: null', async () => {
      smartLinkService.deleteSmartLink.mockResolvedValue(undefined);

      const v1 = mockReqRes({ params: { id: 'sl1' }, query: { brandId: 'b1' } });
      await callHandler(smartLinkController.deleteSmartLink, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'SmartLink deleted successfully' });

      const v2 = mockReqRes({ params: { id: 'sl1' }, query: { brandId: 'b1' } });
      await callHandler(smartLinkControllerV2.deleteSmartLink, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'SmartLink deleted successfully', data: null });
    });
  });

  describe('getPublicSmartLink', () => {
    it('fires trackPageView async and returns the smart link on both versions', async () => {
      smartLinkService.getPublicSmartLinkBySlug.mockResolvedValue({ id: 'sl1', slug: 'my-link' });

      const v2 = mockReqRes({ params: { slug: 'my-link' } });
      await callHandler(smartLinkControllerV2.getPublicSmartLink, v2.req, v2.res);
      expect(smartLinkAnalyticsService.trackPageView).toHaveBeenCalledWith('sl1', '127.0.0.1', undefined);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Public SmartLink retrieved successfully', data: { id: 'sl1', slug: 'my-link' } });
    });
  });

  describe('trackLinkClick', () => {
    it('both return a success message with no data key needed', async () => {
      smartLinkAnalyticsService.trackLinkClick.mockResolvedValue({ id: 'item1' });

      const v1 = mockReqRes({ params: { linkItemId: 'item1' } });
      await callHandler(smartLinkController.trackLinkClick, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'Link click tracked successfully' });

      const v2 = mockReqRes({ params: { linkItemId: 'item1' } });
      await callHandler(smartLinkControllerV2.trackLinkClick, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Link click tracked successfully', data: null });
    });
  });
});
