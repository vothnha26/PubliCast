/**
 * Regression tests for issue #101: handlePaymentConfirmed must use an atomic
 * claim (PENDING -> PROCESSING) so concurrent SePay webhook retries cannot
 * double-activate a plan / create duplicate invoices.
 */
jest.mock('../../src/repositories/billing/payment.repository', () => ({
  findPendingByCode: jest.fn(),
  findPendingByWebhookContent: jest.fn(),
  claimPendingForProcessing: jest.fn(),
  releasePendingClaim: jest.fn(),
  updatePendingStatus: jest.fn(),
  createInvoice: jest.fn()
}));
jest.mock('../../src/repositories/billing/subscription.repository', () => ({
  findActivePlanByBrandId: jest.fn()
}));
jest.mock('../../src/repositories/billing/addon.repository', () => ({
  addSubscriptionAddon: jest.fn()
}));
jest.mock('../../src/services/billing/plan-activation.service', () => ({
  activate: jest.fn()
}));
jest.mock('../../src/services/core/notification.service', () => ({
  create: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('../../src/services/billing/payment-gateway/payment-gateway.factory', () => ({
  getGateway: jest.fn(() => ({}))
}));
jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkPermission: jest.fn(),
  checkBrandAccess: jest.fn()
}));

const subscriptionService = require('../../src/services/billing/subscription.service');
const paymentRepository = require('../../src/repositories/billing/payment.repository');
const subscriptionRepository = require('../../src/repositories/billing/subscription.repository');
const planActivationService = require('../../src/services/billing/plan-activation.service');

function pendingPlanPayment() {
  return {
    transactionCode: 'TX-1',
    status: 'PENDING',
    brandId: 'brand-1',
    planId: 'plan-pro',
    addonId: null,
    amount: '199000',
    currency: 'VND',
    expiredAt: new Date(Date.now() + 3600_000),
    plan: { name: 'Pro', billingCycle: 'MONTHLY' }
  };
}

describe('handlePaymentConfirmed atomic claim (#101)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    subscriptionRepository.findActivePlanByBrandId.mockResolvedValue({ id: 'sub-1' });
    planActivationService.activate.mockResolvedValue(undefined);
    paymentRepository.createInvoice.mockResolvedValue(undefined);
    paymentRepository.updatePendingStatus.mockResolvedValue(undefined);
  });

  test('winner of the claim activates exactly once', async () => {
    paymentRepository.findPendingByCode.mockResolvedValue(pendingPlanPayment());
    paymentRepository.claimPendingForProcessing.mockResolvedValue(true);

    const res = await subscriptionService.handlePaymentConfirmed('TX-1', 199000);

    expect(res).toEqual({ success: true, reason: 'ACTIVATED' });
    expect(planActivationService.activate).toHaveBeenCalledTimes(1);
    expect(paymentRepository.createInvoice).toHaveBeenCalledTimes(1);
    expect(paymentRepository.updatePendingStatus).toHaveBeenCalledWith('TX-1', 'PAID');
  });

  test('loser of the claim does NOT activate or create an invoice', async () => {
    // Both webhooks read PENDING (guard passes) but the DB claim is lost.
    paymentRepository.findPendingByCode.mockResolvedValue(pendingPlanPayment());
    paymentRepository.claimPendingForProcessing.mockResolvedValue(false);

    const res = await subscriptionService.handlePaymentConfirmed('TX-1', 199000);

    expect(res).toEqual({ success: true, reason: 'ALREADY_PROCESSED' });
    expect(planActivationService.activate).not.toHaveBeenCalled();
    expect(paymentRepository.createInvoice).not.toHaveBeenCalled();
  });

  test('releases the claim back to PENDING if activation throws', async () => {
    paymentRepository.findPendingByCode.mockResolvedValue(pendingPlanPayment());
    paymentRepository.claimPendingForProcessing.mockResolvedValue(true);
    paymentRepository.releasePendingClaim.mockResolvedValue(undefined);
    planActivationService.activate.mockRejectedValue(new Error('activation boom'));

    await expect(subscriptionService.handlePaymentConfirmed('TX-1', 199000)).rejects.toThrow('activation boom');
    expect(paymentRepository.releasePendingClaim).toHaveBeenCalledWith('TX-1');
    expect(paymentRepository.createInvoice).not.toHaveBeenCalled();
  });

  test('an already-PAID payment is short-circuited before the claim', async () => {
    paymentRepository.findPendingByCode.mockResolvedValue({ ...pendingPlanPayment(), status: 'PAID' });

    const res = await subscriptionService.handlePaymentConfirmed('TX-1', 199000);

    expect(res).toEqual({ success: true, reason: 'ALREADY_PROCESSED' });
    expect(paymentRepository.claimPendingForProcessing).not.toHaveBeenCalled();
  });
});
