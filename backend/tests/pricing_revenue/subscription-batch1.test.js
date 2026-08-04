/**
 * Regression tests for the batch-1 fixes:
 * - #103: initiateAddonPayment must reject non-positive-integer quantities.
 * - #103: checkPaymentStatus must not re-run the EXPIRED transition / re-send
 *   the "expired" notification on every poll (frontend polls every ~3s).
 */
jest.mock('../../src/repositories/billing/payment.repository', () => ({
  findPendingByCode: jest.fn(),
  expireIfPending: jest.fn()
}));
jest.mock('../../src/repositories/billing/addon.repository', () => ({
  findById: jest.fn()
}));
jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkBrandAccess: jest.fn(),
  checkPermission: jest.fn()
}));
jest.mock('../../src/services/core/notification.service', () => ({
  create: jest.fn().mockResolvedValue(undefined),
  notifyBrandMembers: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('../../src/services/billing/payment-gateway/payment-gateway.factory', () => ({
  getGateway: jest.fn(() => ({
    generatePayment: jest.fn().mockResolvedValue({ bankInfo: {}, qrDataUrl: '', deeplink: '' })
  }))
}));

const subscriptionService = require('../../src/services/billing/subscription.service');
const paymentRepository = require('../../src/repositories/billing/payment.repository');
const addonRepository = require('../../src/repositories/billing/addon.repository');
const authorizationFacade = require('../../src/services/auth/authorization.facade');
const notificationService = require('../../src/services/core/notification.service');

describe('initiateAddonPayment quantity validation (#103)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addonRepository.findById.mockResolvedValue({
      id: 'addon-1', isActive: true, priceAmount: '10000', currency: 'VND', type: 'SEATS', name: 'Extra seats'
    });
  });

  it.each([-1, 0, 0.5, 101])('rejects quantity=%p', async (quantity) => {
    await expect(subscriptionService.initiateAddonPayment('brand-1', 'addon-1', quantity))
      .rejects.toMatchObject({ status: 400 });
  });

  it('accepts a valid positive integer quantity', async () => {
    paymentRepository.createPending = jest.fn().mockResolvedValue({});

    await expect(subscriptionService.initiateAddonPayment('brand-1', 'addon-1', 3)).resolves.toBeDefined();
  });
});

describe('checkPaymentStatus write-on-GET idempotency (#103)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authorizationFacade.checkBrandAccess.mockResolvedValue(true);
  });

  function expiredPending() {
    return {
      transactionCode: 'TX-1',
      status: 'PENDING',
      brandId: 'brand-1',
      expiredAt: new Date(Date.now() - 1000)
    };
  }

  it('sends the expired notification only when this call wins the PENDING->EXPIRED transition', async () => {
    paymentRepository.findPendingByCode.mockResolvedValue(expiredPending());
    paymentRepository.expireIfPending.mockResolvedValue(true);

    const res = await subscriptionService.checkPaymentStatus('TX-1', 'user-1');

    expect(res).toEqual({ status: 'EXPIRED' });
    expect(notificationService.notifyBrandMembers).toHaveBeenCalledTimes(1);
  });

  it('does not re-send the notification when a concurrent poll already won the transition', async () => {
    paymentRepository.findPendingByCode.mockResolvedValue(expiredPending());
    paymentRepository.expireIfPending.mockResolvedValue(false);

    const res = await subscriptionService.checkPaymentStatus('TX-1', 'user-1');

    expect(res).toEqual({ status: 'EXPIRED' });
    expect(notificationService.notifyBrandMembers).not.toHaveBeenCalled();
  });
});
