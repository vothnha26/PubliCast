const request = require('supertest');

// Mock otplib to prevent ESModule parsing errors on @scure/base in Jest
jest.mock('otplib', () => ({
  authenticator: {
    generate: jest.fn(),
    verify: jest.fn()
  }
}));

// Mock auth so req.user is controllable per test.
jest.mock('../../src/middlewares/auth.middleware', () => ({
  verifyAuth: (req, res, next) => {
    req.user = { id: 'caller-user-id', email: 'caller@publicast.com', role: 'USER' };
    next();
  }
}));

jest.mock('../../src/services/auth/authorization.facade');
jest.mock('../../src/repositories/billing/payment.repository');
jest.mock('../../src/repositories/billing/subscription.repository');
jest.mock('../../src/repositories/billing/addon.repository');
jest.mock('../../src/repositories/workspace/post.repository');
jest.mock('../../src/services/core/notification.service');

const app = require('../../src/app');
const authorizationFacade = require('../../src/services/auth/authorization.facade');
const paymentRepository = require('../../src/repositories/billing/payment.repository');
const subscriptionRepository = require('../../src/repositories/billing/subscription.repository');
const postRepository = require('../../src/repositories/workspace/post.repository');

describe('Billing subscription routes — permission enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/billing/subscriptions/initiate', () => {
    it('returns 403 when the caller lacks MANAGE_BILLING on the brand', async () => {
      authorizationFacade.checkPermission.mockResolvedValue(false);

      const res = await request(app)
        .post('/api/billing/subscriptions/initiate')
        .send({ planId: 'plan-1', brandId: 'brand-1' })
        .expect(403);

      expect(res.body.message).toContain('không có quyền');
      expect(subscriptionRepository.findPlanById).not.toHaveBeenCalled();
    });

    it('proceeds when the caller has MANAGE_BILLING on the brand', async () => {
      authorizationFacade.checkPermission.mockResolvedValue(true);
      subscriptionRepository.findPlanById.mockResolvedValue(null);
      subscriptionRepository.findPlanByName = jest.fn().mockResolvedValue(null);

      // Plan lookup fails downstream (mocked repo returns null) — asserting only
      // that the permission gate let the request reach the service, not full success.
      const res = await request(app)
        .post('/api/billing/subscriptions/initiate')
        .send({ planId: 'plan-1', brandId: 'brand-1' });

      expect(res.status).not.toBe(403);
    });
  });

  describe('POST /api/billing/subscriptions/addons/initiate', () => {
    it('returns 403 when the caller lacks MANAGE_BILLING on the brand', async () => {
      authorizationFacade.checkPermission.mockResolvedValue(false);

      const res = await request(app)
        .post('/api/billing/subscriptions/addons/initiate')
        .send({ addonId: 'addon-1', brandId: 'brand-1' })
        .expect(403);

      expect(res.body.message).toContain('không có quyền');
    });
  });

  describe('GET /api/billing/subscriptions/current', () => {
    it('returns 403 when the caller is not a member of the brand', async () => {
      authorizationFacade.checkBrandAccess.mockResolvedValue(false);

      const res = await request(app)
        .get('/api/billing/subscriptions/current')
        .query({ brandId: 'brand-1' })
        .expect(403);

      expect(res.body.message).toContain('không có quyền');
    });

    it('returns 200 for an active member even without MANAGE_BILLING (read/write split)', async () => {
      authorizationFacade.checkBrandAccess.mockResolvedValue(true);
      subscriptionRepository.findActivePlanByBrandId.mockResolvedValue(null);
      postRepository.countActivePostsThisMonth.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/billing/subscriptions/current')
        .query({ brandId: 'brand-1' })
        .expect(200);

      expect(res.body.data.planName).toBe('FREE');
      // checkPermission (MANAGE_BILLING) must never be consulted for a read route.
      expect(authorizationFacade.checkPermission).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/billing/subscriptions/history', () => {
    it('returns 403 when the caller is not a member of the brand', async () => {
      authorizationFacade.checkBrandAccess.mockResolvedValue(false);

      await request(app)
        .get('/api/billing/subscriptions/history')
        .query({ brandId: 'brand-1' })
        .expect(403);
    });

    it('returns 200 for an active member', async () => {
      authorizationFacade.checkBrandAccess.mockResolvedValue(true);
      paymentRepository.findHistoryByBrandId.mockResolvedValue([]);

      await request(app)
        .get('/api/billing/subscriptions/history')
        .query({ brandId: 'brand-1' })
        .expect(200);
    });
  });

  describe('POST /api/billing/subscriptions/cancel (no brandId in request)', () => {
    it('returns 403 when the caller lacks MANAGE_BILLING on the transaction\'s brand', async () => {
      paymentRepository.findPendingByCode.mockResolvedValue({
        transactionCode: 'TX-1',
        status: 'PENDING',
        brandId: 'brand-1'
      });
      authorizationFacade.checkPermission.mockResolvedValue(false);

      const res = await request(app)
        .post('/api/billing/subscriptions/cancel')
        .send({ transactionCode: 'TX-1' })
        .expect(403);

      expect(res.body.message).toContain('không có quyền');
      expect(paymentRepository.updatePendingStatus).not.toHaveBeenCalled();
    });

    it('cancels when the caller has MANAGE_BILLING on the transaction\'s brand', async () => {
      paymentRepository.findPendingByCode.mockResolvedValue({
        transactionCode: 'TX-1',
        status: 'PENDING',
        brandId: 'brand-1'
      });
      authorizationFacade.checkPermission.mockResolvedValue(true);
      paymentRepository.updatePendingStatus.mockResolvedValue({ status: 'CANCELLED' });

      await request(app)
        .post('/api/billing/subscriptions/cancel')
        .send({ transactionCode: 'TX-1' })
        .expect(200);

      expect(paymentRepository.updatePendingStatus).toHaveBeenCalledWith('TX-1', 'CANCELLED');
    });
  });

  describe('GET /api/billing/subscriptions/status/:transactionCode (no brandId in request)', () => {
    it('returns 403 when the caller is not a member of the transaction\'s brand', async () => {
      paymentRepository.findPendingByCode.mockResolvedValue({
        transactionCode: 'TX-1',
        status: 'PENDING',
        brandId: 'brand-1',
        expiredAt: new Date(Date.now() + 60_000)
      });
      authorizationFacade.checkBrandAccess.mockResolvedValue(false);

      const res = await request(app)
        .get('/api/billing/subscriptions/status/TX-1')
        .expect(403);

      expect(res.body.message).toContain('không có quyền');
    });

    it('returns 200 for an active member of the transaction\'s brand', async () => {
      paymentRepository.findPendingByCode.mockResolvedValue({
        transactionCode: 'TX-1',
        status: 'PENDING',
        brandId: 'brand-1',
        expiredAt: new Date(Date.now() + 60_000)
      });
      authorizationFacade.checkBrandAccess.mockResolvedValue(true);

      const res = await request(app)
        .get('/api/billing/subscriptions/status/TX-1')
        .expect(200);

      expect(res.body.data.status).toBe('PENDING');
    });
  });
});
