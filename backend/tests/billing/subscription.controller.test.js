jest.mock('../../src/services/billing/subscription.service', () => ({
  initiatePayment: jest.fn(),
  checkPaymentStatus: jest.fn(),
  initiateAddonPayment: jest.fn(),
  cancelPendingPayment: jest.fn(),
  getPlans: jest.fn()
}));
jest.mock('../../src/repositories/billing/addon.repository', () => ({
  findActiveAddons: jest.fn()
}));
jest.mock('../../src/repositories/billing/subscription.repository', () => ({
  findActivePlanByBrandId: jest.fn()
}));
jest.mock('../../src/repositories/workspace/post.repository', () => ({
  countActivePostsThisMonth: jest.fn()
}));
jest.mock('../../src/repositories/billing/payment.repository', () => ({
  findHistoryByBrandId: jest.fn()
}));

const subscriptionService = require('../../src/services/billing/subscription.service');
const addonRepository = require('../../src/repositories/billing/addon.repository');
const subscriptionRepository = require('../../src/repositories/billing/subscription.repository');
const postRepository = require('../../src/repositories/workspace/post.repository');
const subscriptionController = require('../../src/controllers/billing/subscription.controller');
const subscriptionControllerV2 = require('../../src/controllers/billing/subscription.controller.v2');

function mockReqRes({ params = {}, query = {}, body = {}, user = { id: 'user-1' } } = {}) {
  const req = { params, query, body, user };
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

describe('SubscriptionController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiatePayment', () => {
    it('400s without planId/brandId, and returns 201 with the QR result otherwise, on both versions', async () => {
      const v1 = mockReqRes({ body: {} });
      await callHandler(subscriptionController.initiatePayment, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      subscriptionService.initiatePayment.mockResolvedValue({ qrUrl: 'x', transactionCode: 't1' });
      const v2 = mockReqRes({ body: { planId: 'p1', brandId: 'b1' } });
      await callHandler(subscriptionControllerV2.initiatePayment, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(201);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Tạo mã QR thanh toán thành công', data: { qrUrl: 'x', transactionCode: 't1' } });
    });
  });

  describe('checkPaymentStatus', () => {
    it('v1 has no message; v2 fills in the default "Success" message', async () => {
      subscriptionService.checkPaymentStatus.mockResolvedValue({ status: 'CONFIRMED' });

      const v1 = mockReqRes({ params: { transactionCode: 't1' } });
      await callHandler(subscriptionController.checkPaymentStatus, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ data: { status: 'CONFIRMED' } });

      const v2 = mockReqRes({ params: { transactionCode: 't1' } });
      await callHandler(subscriptionControllerV2.checkPaymentStatus, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Success', data: { status: 'CONFIRMED' } });
    });
  });

  describe('getCurrentPlan', () => {
    it('returns FREE plan defaults when no active subscription exists, on both versions', async () => {
      subscriptionRepository.findActivePlanByBrandId.mockResolvedValue(null);
      postRepository.countActivePostsThisMonth.mockResolvedValue(2);

      const v2 = mockReqRes({ query: { brandId: 'b1' } });
      await callHandler(subscriptionControllerV2.getCurrentPlan, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({
        message: 'Success',
        data: { planName: 'FREE', limits: { maxPostsPerMonth: 10 }, postsUsedThisMonth: 2 }
      });
    });
  });

  describe('getActiveAddons / getPlans', () => {
    it('both return the list wrapped under {message, data}', async () => {
      addonRepository.findActiveAddons.mockResolvedValue([{ id: 'a1' }]);
      const v2a = mockReqRes();
      await callHandler(subscriptionControllerV2.getActiveAddons, v2a.req, v2a.res);
      expect(v2a.res.json).toHaveBeenCalledWith({ message: 'Success', data: [{ id: 'a1' }] });

      subscriptionService.getPlans.mockResolvedValue([{ id: 'plan1' }]);
      const v2b = mockReqRes();
      await callHandler(subscriptionControllerV2.getPlans, v2b.req, v2b.res);
      expect(v2b.res.json).toHaveBeenCalledWith({ message: 'Success', data: [{ id: 'plan1' }] });
    });
  });

  describe('cancelPayment', () => {
    it('400s without transactionCode, on both versions', async () => {
      const v1 = mockReqRes({ body: {} });
      await callHandler(subscriptionController.cancelPayment, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({ body: {} });
      await callHandler(subscriptionControllerV2.cancelPayment, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });
  });
});
