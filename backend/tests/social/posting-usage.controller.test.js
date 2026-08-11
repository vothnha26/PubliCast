jest.mock('../../src/services/workspace/posting-usage.service', () => ({
  getDailyUsageForBrand: jest.fn()
}));

const postingUsageService = require('../../src/services/workspace/posting-usage.service');
const postingUsageController = require('../../src/controllers/workspace/posting-usage.controller');
const postingUsageControllerV2 = require('../../src/controllers/workspace/posting-usage.controller.v2');

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

describe('PostingUsageController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDailyUsage', () => {
    it('v1 already used the {message, data} shape — v2 preserves it exactly', async () => {
      const usage = [{ platform: 'FACEBOOK', used: 10, limit: 35 }];
      postingUsageService.getDailyUsageForBrand.mockResolvedValue(usage);

      const v1 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(postingUsageController.getDailyUsage, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'Daily posting usage retrieved successfully', data: usage });

      const v2 = mockReqRes({ brandId: 'brand-1' });
      await callHandler(postingUsageControllerV2.getDailyUsage, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Daily posting usage retrieved successfully', data: usage });
    });

    it('400s without brandId on both versions', async () => {
      const v1 = mockReqRes({});
      await callHandler(postingUsageController.getDailyUsage, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);
      expect(postingUsageService.getDailyUsageForBrand).not.toHaveBeenCalled();

      const v2 = mockReqRes({});
      await callHandler(postingUsageControllerV2.getDailyUsage, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
      expect(postingUsageService.getDailyUsageForBrand).not.toHaveBeenCalled();
    });
  });
});
