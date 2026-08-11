jest.mock('../../src/services/social/social.service', () => ({
  getAggregatedMetrics: jest.fn(),
  getMetricsVersion: jest.fn()
}));

const socialService = require('../../src/services/social/social.service');
const socialAnalyticsController = require('../../src/controllers/social/social-analytics.controller');
const socialAnalyticsControllerV2 = require('../../src/controllers/social/social-analytics.controller.v2');

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

describe('SocialAnalyticsController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetrics', () => {
    it('v1 already used the {message, data} shape — v2 preserves it exactly', async () => {
      socialService.getAggregatedMetrics.mockResolvedValue({ followers: 1000 });

      const v1 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(socialAnalyticsController.getMetrics, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'Metrics fetched successfully', data: { followers: 1000 } });

      const v2 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(socialAnalyticsControllerV2.getMetrics, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Metrics fetched successfully', data: { followers: 1000 } });
    });

    it('400s without brandId on both versions', async () => {
      const v1 = mockReqRes({});
      await callHandler(socialAnalyticsController.getMetrics, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({});
      await callHandler(socialAnalyticsControllerV2.getMetrics, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getMetricsVersion', () => {
    it('v1 and v2 both return the same version wrapped in { version }', async () => {
      socialService.getMetricsVersion.mockResolvedValue(42);

      const v1 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(socialAnalyticsController.getMetricsVersion, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'Metrics version fetched successfully', data: { version: 42 } });

      const v2 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(socialAnalyticsControllerV2.getMetricsVersion, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Metrics version fetched successfully', data: { version: 42 } });
    });

    it('400s without brandId on both versions', async () => {
      const v1 = mockReqRes({});
      await callHandler(socialAnalyticsController.getMetricsVersion, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({});
      await callHandler(socialAnalyticsControllerV2.getMetricsVersion, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });
  });
});
