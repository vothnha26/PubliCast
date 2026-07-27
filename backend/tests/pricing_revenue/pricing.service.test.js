const pricingService = require('../../src/services/admin/pricing.service');
const planRepository = require('../../src/repositories/admin/plan.repository');
const planLimitRepository = require('../../src/repositories/admin/plan-limit.repository');
const { BILLING_CYCLES } = require('../../src/utils/constants');

jest.mock('../../src/repositories/admin/plan.repository', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByNameAndCycle: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getSubscriptionStats: jest.fn()
}));

jest.mock('../../src/repositories/admin/plan-limit.repository', () => ({
  findById: jest.fn(),
  findAll: jest.fn()
}));

describe('PricingService Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockPlanLimit = {
    id: 'limit-1',
    maxBrands: 3,
    maxSocialProfiles: 10,
    maxPostsPerMonth: 100,
    maxLivePlatforms: 2,
    maxStreamQuality: '1080p',
    maxTeamSeats: 5,
    allowCustomRoles: true,
    allowApprovalWorkflow: true
  };

  const mockPlans = [
    {
      id: 'plan-1',
      name: 'Starter',
      priceAmount: 19.00,
      currency: 'USD',
      billingCycle: 'MONTHLY',
      description: 'Starter plan',
      isActive: true,
      planLimit: mockPlanLimit,
      subscriptions: [
        { id: 'sub-1', userId: 'user-1', status: 'ACTIVE' }
      ]
    },
    {
      id: 'plan-2',
      name: 'Pro',
      priceAmount: 190.00,
      currency: 'USD',
      billingCycle: 'ANNUAL',
      description: 'Pro annual plan',
      isActive: true,
      planLimit: mockPlanLimit,
      subscriptions: [
        { id: 'sub-2', userId: 'user-2', status: 'ACTIVE' },
        { id: 'sub-3', userId: 'user-3', status: 'ACTIVE' }
      ]
    },
    {
      id: 'plan-3',
      name: 'Enterprise Inactive',
      priceAmount: 500.00,
      currency: 'USD',
      billingCycle: 'MONTHLY',
      description: 'Enterprise custom',
      isActive: false,
      planLimit: mockPlanLimit,
      subscriptions: []
    }
  ];

  describe('PRICING_001 - getAllPricingPlans (Success)', () => {
    it('should return all plans and their summary when data exists', async () => {
      planRepository.findAll.mockResolvedValue(mockPlans);

      const result = await pricingService.getAllPricingPlans();

      expect(result.plans).toHaveLength(3);
      expect(result.summary).toEqual({
        totalPlans: 3,
        activePlans: 2,
        inactivePlans: 1,
        totalSubscriptions: 3
      });
      expect(planRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('PRICING_002 - getAllPricingPlans (Empty)', () => {
    it('should return empty plans array and zeroed summary when no plans exist', async () => {
      planRepository.findAll.mockResolvedValue([]);

      const result = await pricingService.getAllPricingPlans();

      expect(result.plans).toHaveLength(0);
      expect(result.summary).toEqual({
        totalPlans: 0,
        activePlans: 0,
        inactivePlans: 0,
        totalSubscriptions: 0
      });
    });
  });

  describe('PRICING_003 - getPlanDetails (Success)', () => {
    it('should return plan details, formatted limits and subscription stats', async () => {
      const targetPlan = mockPlans[0];
      planRepository.findById.mockResolvedValue(targetPlan);
      const mockStats = {
        total: 1,
        active: 1,
        expired: 0,
        cancelled: 0,
        subscriptions: targetPlan.subscriptions
      };
      planRepository.getSubscriptionStats.mockResolvedValue(mockStats);

      const result = await pricingService.getPlanDetails('plan-1');

      expect(result.id).toBe('plan-1');
      expect(result.name).toBe('Starter');
      expect(result.price).toEqual({ amount: 19, currency: 'USD' });
      expect(result.limits.maxBrands).toBe(3);
      expect(result.subscriptionStats).toEqual(mockStats);
      expect(planRepository.findById).toHaveBeenCalledWith('plan-1');
      expect(planRepository.getSubscriptionStats).toHaveBeenCalledWith('plan-1');
    });
  });

  describe('PRICING_004 - getPlanDetails (Not Found)', () => {
    it('should throw a 404 error if the plan does not exist', async () => {
      planRepository.findById.mockResolvedValue(null);

      await expect(pricingService.getPlanDetails('invalid-plan'))
        .rejects
        .toThrow('Plan not found');
      
      try {
        await pricingService.getPlanDetails('invalid-plan');
      } catch (err) {
        expect(err.status).toBe(404);
      }
    });
  });

  describe('PRICING_005 - createPlan (Success)', () => {
    it('should create a new plan when valid data is provided', async () => {
      const newPlanData = {
        name: 'Agency',
        priceAmount: 99.00,
        currency: 'USD',
        billingCycle: 'MONTHLY',
        description: 'Agency monthly plan',
        planLimitId: 'limit-1'
      };

      planRepository.findByNameAndCycle.mockResolvedValue(null);
      planLimitRepository.findById.mockResolvedValue(mockPlanLimit);
      planRepository.create.mockResolvedValue({
        id: 'plan-new',
        ...newPlanData,
        isActive: true,
        planLimit: mockPlanLimit
      });

      const result = await pricingService.createPlan(newPlanData);

      expect(result.id).toBe('plan-new');
      expect(result.name).toBe('Agency');
      expect(result.isActive).toBe(true);
      expect(planRepository.findByNameAndCycle).toHaveBeenCalledWith('Agency', 'MONTHLY');
      expect(planLimitRepository.findById).toHaveBeenCalledWith('limit-1');
      expect(planRepository.create).toHaveBeenCalled();
    });
  });

  describe('PRICING_006 - createPlan (Conflict)', () => {
    it('should throw a 409 error if plan name and cycle already exists', async () => {
      const planData = {
        name: 'Starter',
        priceAmount: 19.00,
        currency: 'USD',
        billingCycle: 'MONTHLY',
        planLimitId: 'limit-1'
      };

      planRepository.findByNameAndCycle.mockResolvedValue(mockPlans[0]);

      await expect(pricingService.createPlan(planData))
        .rejects
        .toThrow('Plan "Starter" already exists');
      
      try {
        await pricingService.createPlan(planData);
      } catch (err) {
        expect(err.status).toBe(409);
      }
    });
  });

  describe('PRICING_007 - createPlan (Invalid Data)', () => {
    it('should validate missing name', async () => {
      const invalidData = { priceAmount: 10, billingCycle: 'MONTHLY', planLimitId: 'limit-1' };
      await expect(pricingService.createPlan(invalidData)).rejects.toThrow('Name required');
    });

    it('should validate non-numeric price', async () => {
      const invalidData = { name: 'Free', priceAmount: 'abc', billingCycle: 'MONTHLY', planLimitId: 'limit-1' };
      await expect(pricingService.createPlan(invalidData)).rejects.toThrow('Price numeric required');
    });

    it('should validate invalid billing cycle', async () => {
      const invalidData = { name: 'Free', priceAmount: 0, billingCycle: 'DAILY', planLimitId: 'limit-1' };
      await expect(pricingService.createPlan(invalidData)).rejects.toThrow('Invalid cycle');
    });

    it('should validate missing limit ID', async () => {
      const invalidData = { name: 'Free', priceAmount: 0, billingCycle: 'MONTHLY' };
      await expect(pricingService.createPlan(invalidData)).rejects.toThrow('Limit ID required');
    });

    it('should validate missing plan limit record', async () => {
      const planData = { name: 'Free', priceAmount: 0, billingCycle: 'MONTHLY', planLimitId: 'non-existent' };
      planRepository.findByNameAndCycle.mockResolvedValue(null);
      planLimitRepository.findById.mockResolvedValue(null);

      await expect(pricingService.createPlan(planData)).rejects.toThrow('Plan limit not found');
    });
  });

  describe('PRICING_008 - updatePlan (Success)', () => {
    it('should update plan fields successfully', async () => {
      const updateData = { priceAmount: 25.00, description: 'Updated desc' };
      planRepository.findById.mockResolvedValue(mockPlans[0]);
      planRepository.update.mockResolvedValue({
        ...mockPlans[0],
        priceAmount: 25.00,
        description: 'Updated desc'
      });

      const result = await pricingService.updatePlan('plan-1', updateData);

      expect(result.price.amount).toBe(25.00);
      expect(result.description).toBe('Updated desc');
      expect(planRepository.update).toHaveBeenCalledWith('plan-1', {
        priceAmount: 25.00,
        description: 'Updated desc'
      });
    });
  });

  describe('PRICING_009 - updatePlan (Invalid Price)', () => {
    it('should throw an error if updating with a negative price', async () => {
      planRepository.findById.mockResolvedValue(mockPlans[0]);

      await expect(pricingService.updatePlan('plan-1', { priceAmount: -5.00 }))
        .rejects
        .toThrow('Price invalid');
    });
  });

  describe('PRICING_010 - deactivatePlan (Soft Delete Success)', () => {
    it('should soft delete the plan by changing isActive to false and return updated plan', async () => {
      const activePlan = mockPlans[0];
      planRepository.findById.mockResolvedValue(activePlan);
      planRepository.delete.mockResolvedValue({
        ...activePlan,
        isActive: false
      });

      const result = await pricingService.deactivatePlan('plan-1');

      expect(result.isActive).toBe(false);
      expect(planRepository.delete).toHaveBeenCalledWith('plan-1');
    });
  });

  describe('PRICING_011 - deactivatePlan (Conflict)', () => {
    it('should throw an error if the plan is already inactive', async () => {
      const inactivePlan = mockPlans[2];
      planRepository.findById.mockResolvedValue(inactivePlan);

      await expect(pricingService.deactivatePlan('plan-3'))
        .rejects
        .toThrow('Plan already inactive');
    });
  });

  describe('PRICING_012 - getPricingAnalytics', () => {
    it('should calculate theoretical monthly and annual revenue based on active subscriptions', async () => {
      // Mock active plans. pricingService.getPricingAnalytics only process plans where isActive is true
      planRepository.findAll.mockResolvedValue(mockPlans);

      const analytics = await pricingService.getPricingAnalytics();

      // Subscription count:
      // Starter (Monthly): 1 subscription at $19 -> monthly = 19, annual = 19 * 12 = 228
      // Pro (Annual): 2 subscriptions at $190 -> annual = 190 * 2 = 380, monthly = (190 * 2) / 12 = 31.6666...
      // Enterprise (Inactive): 0 subscription -> Ignored
      // Total monthlyRevenue: 19
      // Total annualRevenue: 380
      expect(analytics.monthlyRevenue).toBe(19);
      expect(analytics.annualRevenue).toBe(380);
      expect(analytics.subscriptionsByPlan['Starter']).toBe(1);
      expect(analytics.subscriptionsByPlan['Pro']).toBe(2);
      expect(analytics.revenueByPlan['Starter']).toEqual({ monthly: 19, annual: 228 });
      expect(analytics.revenueByPlan['Pro']).toEqual({ monthly: 380 / 12, annual: 380 });
    });
  });
});
