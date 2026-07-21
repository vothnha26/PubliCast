/**
 * Regression tests for:
 * - #101: handlePaymentConfirmed must use an atomic claim (PENDING ->
 *   PROCESSING) so concurrent SePay webhook retries cannot double-activate
 *   a plan / create duplicate invoices.
 * - #52: the activate/invoice/mark-PAID sequence must run inside a single
 *   DB transaction so a mid-sequence failure rolls back everything instead
 *   of leaving a half-applied state (e.g. plan activated but no invoice).
 *
 * prisma.$transaction is mocked to invoke its callback with a fake `tx`
 * object (so we never touch a real DB) while still letting us assert the
 * transaction wrapper is actually used and rolls back on error.
 */
jest.mock('../../src/config/prisma', () => ({
  $transaction: jest.fn(async (fn) => fn({ __tx: true }))
}));
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
const prisma = require('../../src/config/prisma');

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

  test('winner of the claim activates exactly once, inside a transaction', async () => {
    paymentRepository.findPendingByCode.mockResolvedValue(pendingPlanPayment());
    paymentRepository.claimPendingForProcessing.mockResolvedValue(true);

    const res = await subscriptionService.handlePaymentConfirmed('TX-1', 199000);

    expect(res).toEqual({ success: true, reason: 'ACTIVATED' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(planActivationService.activate).toHaveBeenCalledTimes(1);
    // Fourth arg is the `tx` client the fake $transaction injected — proves
    // activation runs inside the transaction, not against the global client.
    expect(planActivationService.activate).toHaveBeenCalledWith(
      'sub-1', 'plan-pro', 'MONTHLY', { __tx: true }
    );
    expect(paymentRepository.createInvoice).toHaveBeenCalledTimes(1);
    expect(paymentRepository.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionId: 'sub-1' }), { __tx: true }
    );
    expect(paymentRepository.updatePendingStatus).toHaveBeenCalledWith('TX-1', 'PAID', { __tx: true });
  });

  test('a mid-transaction failure rolls back and never marks PAID or invoices (#52)', async () => {
    // createInvoice throws AFTER plan activation succeeded (inside the same
    // $transaction callback). Because our fake $transaction just awaits the
    // callback, a real Prisma transaction would roll back everything the
    // callback did with `tx` up to the throw — so updatePendingStatus('PAID')
    // must never be reached, and the outer catch releases the claim.
    paymentRepository.findPendingByCode.mockResolvedValue(pendingPlanPayment());
    paymentRepository.claimPendingForProcessing.mockResolvedValue(true);
    paymentRepository.releasePendingClaim.mockResolvedValue(undefined);
    paymentRepository.createInvoice.mockRejectedValue(new Error('DB connection lost'));

    await expect(subscriptionService.handlePaymentConfirmed('TX-1', 199000)).rejects.toThrow('DB connection lost');

    expect(planActivationService.activate).toHaveBeenCalledTimes(1);
    expect(paymentRepository.updatePendingStatus).not.toHaveBeenCalledWith('TX-1', 'PAID', expect.anything());
    expect(paymentRepository.releasePendingClaim).toHaveBeenCalledWith('TX-1');
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
