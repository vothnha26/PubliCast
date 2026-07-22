/**
 * Regression tests for issue #104: PlanRepository.update must only write an
 * allow-listed set of scalar fields to prisma.plan.update, instead of
 * spreading the entire request body (mass-assignment).
 */
jest.mock('../../src/config/prisma', () => ({
  plan: { update: jest.fn() }
}));

const planRepository = require('../../src/repositories/admin/plan.repository');
const prisma = require('../../src/config/prisma');

describe('PlanRepository.update field allow-list (#104)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.plan.update.mockResolvedValue({ id: 'plan-1' });
  });

  test('passes through only allow-listed scalar fields', async () => {
    await planRepository.update('plan-1', {
      name: 'PRO',
      priceAmount: 199000,
      currency: 'VND',
      billingCycle: 'MONTHLY',
      description: 'Pro plan',
      planLimitId: 'limit-1',
      isActive: true
    });

    expect(prisma.plan.update).toHaveBeenCalledWith({
      where: { id: 'plan-1' },
      data: {
        name: 'PRO',
        priceAmount: 199000,
        currency: 'VND',
        billingCycle: 'MONTHLY',
        description: 'Pro plan',
        planLimitId: 'limit-1',
        isActive: true
      },
      include: { planLimit: true, products: true }
    });
  });

  test('drops any field not on the allow-list (core #104 bug)', async () => {
    await planRepository.update('plan-1', {
      name: 'PRO',
      // None of the below are on the allow-list and must be dropped.
      id: 'attacker-controlled-id',
      createdAt: '1970-01-01T00:00:00.000Z',
      pendingPayments: [{ id: 'fake' }],
      subscriptions: [{ id: 'fake' }],
      someUnknownField: 'anything'
    });

    expect(prisma.plan.update).toHaveBeenCalledWith({
      where: { id: 'plan-1' },
      data: { name: 'PRO' },
      include: { planLimit: true, products: true }
    });
  });

  test('sets products as a relation `set` when provided as an array of ids', async () => {
    await planRepository.update('plan-1', {
      isActive: true,
      products: ['prod-1', 'prod-2']
    });

    expect(prisma.plan.update).toHaveBeenCalledWith({
      where: { id: 'plan-1' },
      data: {
        isActive: true,
        products: { set: [{ id: 'prod-1' }, { id: 'prod-2' }] }
      },
      include: { planLimit: true, products: true }
    });
  });

  test('omits fields that are undefined instead of writing them as null/undefined', async () => {
    await planRepository.update('plan-1', { isActive: false });

    expect(prisma.plan.update).toHaveBeenCalledWith({
      where: { id: 'plan-1' },
      data: { isActive: false },
      include: { planLimit: true, products: true }
    });
  });
});
