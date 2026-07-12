// Mock dependencies
jest.mock('../../src/repositories/billing/subscription.repository', () => ({
  upgradePlan: jest.fn(),
  findFreePlan: jest.fn(),
  downgradeToFree: jest.fn()
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

const planActivationService = require('../../src/services/billing/plan-activation.service');
const subscriptionRepository = require('../../src/repositories/billing/subscription.repository');

describe('PlanActivationService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('activate()', () => {
    it('should calculate periodEnd correctly for MONTHLY billing cycle and upgrade plan', async () => {
      const subscriptionId = 'sub-123';
      const planId = 'plan-premium-monthly';
      const mockResult = { id: subscriptionId, planId, status: 'ACTIVE' };

      subscriptionRepository.upgradePlan.mockResolvedValue(mockResult);

      const before = Date.now();
      const result = await planActivationService.activate(subscriptionId, planId, 'MONTHLY');
      const after = Date.now();

      expect(result).toEqual(mockResult);
      expect(subscriptionRepository.upgradePlan).toHaveBeenCalledTimes(1);

      // Verify arguments passed to upgradePlan
      const [calledSubId, data] = subscriptionRepository.upgradePlan.mock.calls[0];
      expect(calledSubId).toBe(subscriptionId);
      expect(data.planId).toBe(planId);
      expect(data.periodStart.getTime()).toBeGreaterThanOrEqual(before);
      expect(data.periodStart.getTime()).toBeLessThanOrEqual(after);

      // 30 days calculation validation
      const expectedEnd = new Date(data.periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);
      expect(data.periodEnd.getTime()).toBe(expectedEnd.getTime());
    });

    it('should calculate periodEnd correctly for ANNUAL billing cycle and upgrade plan', async () => {
      const subscriptionId = 'sub-456';
      const planId = 'plan-enterprise-annual';
      const mockResult = { id: subscriptionId, planId, status: 'ACTIVE' };

      subscriptionRepository.upgradePlan.mockResolvedValue(mockResult);

      const before = Date.now();
      const result = await planActivationService.activate(subscriptionId, planId, 'ANNUAL');
      const after = Date.now();

      expect(result).toEqual(mockResult);
      expect(subscriptionRepository.upgradePlan).toHaveBeenCalledTimes(1);

      const [calledSubId, data] = subscriptionRepository.upgradePlan.mock.calls[0];
      expect(calledSubId).toBe(subscriptionId);
      expect(data.planId).toBe(planId);
      
      // 365 days calculation validation
      const expectedEnd = new Date(data.periodStart.getTime() + 365 * 24 * 60 * 60 * 1000);
      expect(data.periodEnd.getTime()).toBe(expectedEnd.getTime());
    });
  });

  describe('downgradeToFree()', () => {
    it('should downgrade subscription to FREE plan successfully if FREE plan exists', async () => {
      const subscriptionId = 'sub-789';
      const mockFreePlan = { id: 'plan-free-id', name: 'FREE' };
      const mockResult = { id: subscriptionId, planId: 'plan-free-id', status: 'ACTIVE' };

      subscriptionRepository.findFreePlan.mockResolvedValue(mockFreePlan);
      subscriptionRepository.downgradeToFree.mockResolvedValue(mockResult);

      const result = await planActivationService.downgradeToFree(subscriptionId);

      expect(result).toEqual(mockResult);
      expect(subscriptionRepository.findFreePlan).toHaveBeenCalledTimes(1);
      expect(subscriptionRepository.downgradeToFree).toHaveBeenCalledWith(subscriptionId, mockFreePlan.id);
    });

    it('should throw an error if FREE plan is not found in database', async () => {
      const subscriptionId = 'sub-789';
      subscriptionRepository.findFreePlan.mockResolvedValue(null);

      await expect(planActivationService.downgradeToFree(subscriptionId))
        .rejects.toThrow('FREE plan not found in database');

      expect(subscriptionRepository.findFreePlan).toHaveBeenCalledTimes(1);
      expect(subscriptionRepository.downgradeToFree).not.toHaveBeenCalled();
    });
  });
});
