const subscriptionService = require('../../src/services/billing/subscription.service');
const paymentRepository = require('../../src/repositories/billing/payment.repository');
const authorizationFacade = require('../../src/services/auth/authorization.facade');

jest.mock('../../src/repositories/billing/payment.repository', () => ({
  findPendingByCode: jest.fn(),
  updatePendingStatus: jest.fn()
}));

jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkPermission: jest.fn(),
  checkBrandAccess: jest.fn()
}));

const CALLER_ID = 'user-1';

describe('SubscriptionService - cancelPendingPayment Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully cancel a pending payment when the caller has MANAGE_BILLING', async () => {
    const mockPending = {
      transactionCode: 'TX-123',
      status: 'PENDING',
      brandId: 'brand-1'
    };

    paymentRepository.findPendingByCode.mockResolvedValue(mockPending);
    authorizationFacade.checkPermission.mockResolvedValue(true);
    paymentRepository.updatePendingStatus.mockResolvedValue({
      ...mockPending,
      status: 'CANCELLED'
    });

    const result = await subscriptionService.cancelPendingPayment('TX-123', CALLER_ID);

    expect(result.status).toBe('CANCELLED');
    expect(paymentRepository.findPendingByCode).toHaveBeenCalledWith('TX-123');
    expect(authorizationFacade.checkPermission).toHaveBeenCalledWith(CALLER_ID, 'brand-1', 'MANAGE_BILLING');
    expect(paymentRepository.updatePendingStatus).toHaveBeenCalledWith('TX-123', 'CANCELLED');
  });

  it('should reject cancelling when the caller lacks MANAGE_BILLING on the transaction\'s brand', async () => {
    const mockPending = {
      transactionCode: 'TX-123',
      status: 'PENDING',
      brandId: 'brand-1'
    };

    paymentRepository.findPendingByCode.mockResolvedValue(mockPending);
    authorizationFacade.checkPermission.mockResolvedValue(false);

    await expect(subscriptionService.cancelPendingPayment('TX-123', CALLER_ID))
      .rejects
      .toMatchObject({ message: expect.stringContaining('không có quyền'), status: 403 });

    expect(paymentRepository.updatePendingStatus).not.toHaveBeenCalled();
  });

  it('should throw a 404 if the payment is not found', async () => {
    paymentRepository.findPendingByCode.mockResolvedValue(null);

    await expect(subscriptionService.cancelPendingPayment('TX-INVALID', CALLER_ID))
      .rejects
      .toMatchObject({ message: 'Không tìm thấy giao dịch thanh toán', status: 404 });

    expect(paymentRepository.findPendingByCode).toHaveBeenCalledWith('TX-INVALID');
    expect(paymentRepository.updatePendingStatus).not.toHaveBeenCalled();
  });

  it('should throw a 400 if the payment is not in PENDING status', async () => {
    const mockPaid = {
      transactionCode: 'TX-123',
      status: 'PAID',
      brandId: 'brand-1'
    };

    paymentRepository.findPendingByCode.mockResolvedValue(mockPaid);

    await expect(subscriptionService.cancelPendingPayment('TX-123', CALLER_ID))
      .rejects
      .toMatchObject({ message: 'Giao dịch không ở trạng thái chờ thanh toán', status: 400 });

    expect(paymentRepository.findPendingByCode).toHaveBeenCalledWith('TX-123');
    expect(paymentRepository.updatePendingStatus).not.toHaveBeenCalled();
  });
});
