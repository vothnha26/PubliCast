const { requireFeature } = require('../../src/middlewares/feature-gate.middleware');
const subscriptionGate = require('../../src/services/subscription/subscription-gate.facade');
const { PRODUCT_IDS } = require('../../src/utils/constants');

jest.mock('../../src/services/subscription/subscription-gate.facade', () => ({
  checkFeatureAccess: jest.fn()
}));

describe('Feature Gate Middleware Unit Tests', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      headers: {},
      query: {},
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 400 if brand ID is missing', async () => {
    const middleware = requireFeature(PRODUCT_IDS.AI_CONTENT_ENGINE);
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'MISSING_BRAND_ID'
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should get brand ID from headers if present', async () => {
    req.headers['x-brand-id'] = 'brand-headers';
    subscriptionGate.checkFeatureAccess.mockResolvedValue(true);

    const middleware = requireFeature(PRODUCT_IDS.AI_CONTENT_ENGINE);
    await middleware(req, res, next);

    expect(subscriptionGate.checkFeatureAccess).toHaveBeenCalledWith('brand-headers', PRODUCT_IDS.AI_CONTENT_ENGINE);
    expect(next).toHaveBeenCalled();
  });

  it('should return 403 if brand does not have access to the feature', async () => {
    req.headers['x-brand-id'] = 'brand-1';
    subscriptionGate.checkFeatureAccess.mockResolvedValue(false);

    const middleware = requireFeature(PRODUCT_IDS.AI_CONTENT_ENGINE);
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'PLAN_UPGRADE_REQUIRED',
      productId: PRODUCT_IDS.AI_CONTENT_ENGINE
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next if brand has access to the feature', async () => {
    req.headers['x-brand-id'] = 'brand-1';
    subscriptionGate.checkFeatureAccess.mockResolvedValue(true);

    const middleware = requireFeature(PRODUCT_IDS.AI_CONTENT_ENGINE);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  // Regression test for #118 H5: previously an uncaught rejection here left
  // the request hanging (Express 4 doesn't route an async throw to the
  // global error handler on its own) instead of failing closed.
  it('forwards a thrown error to next(err) instead of hanging, and does not grant access', async () => {
    req.headers['x-brand-id'] = 'brand-1';
    const dbErr = new Error('DB connection lost');
    subscriptionGate.checkFeatureAccess.mockRejectedValue(dbErr);

    const middleware = requireFeature(PRODUCT_IDS.AI_CONTENT_ENGINE);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(dbErr);
    expect(res.status).not.toHaveBeenCalledWith(200);
  });
});
