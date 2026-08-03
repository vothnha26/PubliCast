jest.mock('../../src/repositories/billing/subscription.repository', () => ({
  findById: jest.fn(),
  upgradePlan: jest.fn(),
  downgradeToFree: jest.fn(),
  findFreePlan: jest.fn(),
}));

const subscriptionRepository = require('../../src/repositories/billing/subscription.repository');
const planActivationService = require('../../src/services/billing/plan-activation.service');

describe('PlanActivationService & ProrationStrategy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates standard 30-day period when no active subscription exists', async () => {
    subscriptionRepository.findById.mockResolvedValue(null);
    subscriptionRepository.upgradePlan.mockImplementation((id, data) => Promise.resolve({ id, ...data }));

    const res = await planActivationService.activate('sub-1', 'plan-pro', 'MONTHLY');

    expect(res.planId).toBe('plan-pro');
    const days = Math.round((new Date(res.periodEnd) - new Date(res.periodStart)) / (1000 * 60 * 60 * 24));
    expect(days).toBe(30);
  });

  it('adds prorated remaining days when upgrading mid-cycle', async () => {
    // Pin "now" for both the test and the service's own `new Date()` call
    // inside activate() — without this, any real time elapsed between the
    // test computing `currentEnd` and the service computing its own `now`
    // (even a few ms) shifts msRemaining below the 10-day boundary and
    // Math.floor rounds proratedDaysAdded down to 9, flaking this test.
    const now = new Date('2026-01-01T00:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    try {
      // 10 days remaining in current subscription
      const currentEnd = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      subscriptionRepository.findById.mockResolvedValue({ id: 'sub-1', periodEnd: currentEnd });
      subscriptionRepository.upgradePlan.mockImplementation((id, data) => Promise.resolve({ id, ...data }));

      const res = await planActivationService.activate('sub-1', 'plan-enterprise', 'MONTHLY');

      const totalDays = Math.round((new Date(res.periodEnd) - new Date(res.periodStart)) / (1000 * 60 * 60 * 24));
      // 30 base days + 10 prorated days = 40 days total
      expect(totalDays).toBe(40);
    } finally {
      jest.useRealTimers();
    }
  });
});
