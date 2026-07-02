const subscriptionService = require('../../src/services/billing/subscription.service');
const paymentRepository = require('../../src/repositories/billing/payment.repository');

jest.mock('../../src/repositories/billing/payment.repository', () => ({
  findPendingByCode: jest.fn(),
  updatePendingStatus: jest.fn()
}));

describe('SubscriptionService - cancelPendingPayment Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully cancel a pending payment', async () => {
    const mockPending = {
      transactionCode: 'TX-123',
      status: 'PENDING',
      brandId: 'brand-1'
    };

    paymentRepository.findPendingByCode.mockResolvedValue(mockPending);
    paymentRepository.updatePendingStatus.mockResolvedValue({
      ...mockPending,
      status: 'CANCELLED'
    });

    const result = await subscriptionService.cancelPendingPayment('TX-123');

    expect(result.status).toBe('CANCELLED');
    expect(paymentRepository.findPendingByCode).toHaveBeenCalledWith('TX-123');
    expect(paymentRepository.updatePendingStatus).toHaveBeenCalledWith('TX-123', 'CANCELLED');
  });

  it('should throw an error if the payment is not found', async () => {
    paymentRepository.findPendingByCode.mockResolvedValue(null);

    await expect(subscriptionService.cancelPendingPayment('TX-INVALID'))
      .rejects
      .toThrow('Không tìm thấy giao dịch thanh toán');

    expect(paymentRepository.findPendingByCode).toHaveBeenCalledWith('TX-INVALID');
    expect(paymentRepository.updatePendingStatus).not.toHaveBeenCalled();
  });

  it('should throw an error if the payment is not in PENDING status', async () => {
    const mockPaid = {
      transactionCode: 'TX-123',
      status: 'PAID',
      brandId: 'brand-1'
    };

    paymentRepository.findPendingByCode.mockResolvedValue(mockPaid);

    await expect(subscriptionService.cancelPendingPayment('TX-123'))
      .rejects
      .toThrow('Giao dịch không ở trạng thái chờ thanh toán');

    expect(paymentRepository.findPendingByCode).toHaveBeenCalledWith('TX-123');
    expect(paymentRepository.updatePendingStatus).not.toHaveBeenCalled();
  });
});
