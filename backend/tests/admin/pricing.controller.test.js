jest.mock('../../src/services/admin/pricing.service', () => ({
  getAllPricingPlans: jest.fn(),
  getPlanDetails: jest.fn(),
  createPlan: jest.fn(),
  updatePlan: jest.fn(),
  deactivatePlan: jest.fn(),
  getPricingAnalytics: jest.fn(),
  getAllPlanLimits: jest.fn(),
  getAllProducts: jest.fn()
}));

const pricingService = require('../../src/services/admin/pricing.service');
const pricingController = require('../../src/controllers/admin/pricing.controller');
const pricingControllerV2 = require('../../src/controllers/admin/pricing.controller.v2');

function mockReqRes({ params = {}, body = {} } = {}) {
  const req = { params, body };
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

describe('PricingController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPricingPlans', () => {
    it('v1 and v2 both return the same plans, v2 under {message, data}', async () => {
      pricingService.getAllPricingPlans.mockResolvedValue([{ id: 'p1' }]);

      const v1 = mockReqRes();
      await callHandler(pricingController.getPricingPlans, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'Pricing plans retrieved successfully', data: [{ id: 'p1' }] });

      const v2 = mockReqRes();
      await callHandler(pricingControllerV2.getPricingPlans, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Pricing plans retrieved successfully', data: [{ id: 'p1' }] });
    });
  });

  describe('getPlanDetails', () => {
    it('400s without planId on both versions', async () => {
      const v1 = mockReqRes({ params: { planId: '  ' } });
      await callHandler(pricingController.getPlanDetails, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({ params: { planId: '  ' } });
      await callHandler(pricingControllerV2.getPlanDetails, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Plan ID is required' });
    });
  });

  describe('createPlan', () => {
    it('v1 returns 201 with the created plan; v2 preserves the 201 status', async () => {
      pricingService.createPlan.mockResolvedValue({ id: 'new-plan' });
      const body = { name: 'Pro', priceAmount: 10, currency: 'USD', billingCycle: 'MONTHLY' };

      const v1 = mockReqRes({ body });
      await callHandler(pricingController.createPlan, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(201);

      const v2 = mockReqRes({ body });
      await callHandler(pricingControllerV2.createPlan, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(201);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Plan created successfully', data: { id: 'new-plan' } });
    });
  });

  describe('updatePlan', () => {
    it('400s when no update data is given, on both versions', async () => {
      const v1 = mockReqRes({ params: { planId: 'p1' }, body: {} });
      await callHandler(pricingController.updatePlan, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({ params: { planId: 'p1' }, body: {} });
      await callHandler(pricingControllerV2.updatePlan, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deactivatePlan / getPricingAnalytics / getPlanLimits / getProducts', () => {
    it('all forward through to the service and return v2Success-shaped output', async () => {
      pricingService.deactivatePlan.mockResolvedValue({ id: 'p1', active: false });
      const v2a = mockReqRes({ params: { planId: 'p1' } });
      await callHandler(pricingControllerV2.deactivatePlan, v2a.req, v2a.res);
      expect(v2a.res.json).toHaveBeenCalledWith({ message: 'Plan deactivated successfully', data: { id: 'p1', active: false } });

      pricingService.getPricingAnalytics.mockResolvedValue({ mrr: 100 });
      const v2b = mockReqRes();
      await callHandler(pricingControllerV2.getPricingAnalytics, v2b.req, v2b.res);
      expect(v2b.res.json).toHaveBeenCalledWith({ message: 'Pricing analytics retrieved successfully', data: { mrr: 100 } });

      pricingService.getAllPlanLimits.mockResolvedValue([{ id: 'l1' }]);
      const v2c = mockReqRes();
      await callHandler(pricingControllerV2.getPlanLimits, v2c.req, v2c.res);
      expect(v2c.res.json).toHaveBeenCalledWith({ message: 'Plan limits retrieved successfully', data: [{ id: 'l1' }] });

      pricingService.getAllProducts.mockResolvedValue([{ id: 'pr1' }]);
      const v2d = mockReqRes();
      await callHandler(pricingControllerV2.getProducts, v2d.req, v2d.res);
      expect(v2d.res.json).toHaveBeenCalledWith({ message: 'Products retrieved successfully', data: [{ id: 'pr1' }] });
    });
  });
});
