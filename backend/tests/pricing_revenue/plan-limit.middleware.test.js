/**
 * Regression tests for #118 H5: checkLimit previously failed OPEN — a
 * missing PlanLimit config or any thrown error (DB down, repo throw) both
 * called next() and let the request through, bypassing every
 * maxBrands/maxPostsPerMonth/maxTeamSeats enforcement. It must now fail
 * CLOSED in both cases.
 */
jest.mock('../../src/repositories/billing/subscription.repository', () => ({
  findActivePlanByBrandId: jest.fn(),
  countBrands: jest.fn(),
  countSocialProfiles: jest.fn(),
  countPostsThisMonth: jest.fn(),
  countTeamSeats: jest.fn()
}));

const subscriptionRepository = require('../../src/repositories/billing/subscription.repository');
const { checkLimit } = require('../../src/middlewares/plan-limit.middleware');

describe('checkLimit middleware (#118 H5)', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { query: { brandId: 'brand-1' }, body: {}, params: {}, user: { id: 'user-1' } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();
  });

  it('denies (fails closed) with 403 when the subscription has no active plan', async () => {
    subscriptionRepository.findActivePlanByBrandId.mockResolvedValue(null);

    await checkLimit('maxPostsPerMonth')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('denies (fails closed) with 403 when PlanLimit config is missing, instead of calling next()', async () => {
    subscriptionRepository.findActivePlanByBrandId.mockResolvedValue({ plan: { name: 'Pro', planLimit: null } });

    await checkLimit('maxPostsPerMonth')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards the error to next(err) (fails closed) instead of calling bare next() on a thrown error', async () => {
    const dbErr = new Error('DB connection lost');
    subscriptionRepository.findActivePlanByBrandId.mockRejectedValue(dbErr);

    await checkLimit('maxPostsPerMonth')(req, res, next);

    expect(next).toHaveBeenCalledWith(dbErr);
    expect(res.status).not.toHaveBeenCalledWith(200);
  });

  it('calls next() (no error) when usage is under the limit', async () => {
    subscriptionRepository.findActivePlanByBrandId.mockResolvedValue({
      plan: { name: 'Pro', planLimit: { maxPostsPerMonth: 100 } }
    });
    subscriptionRepository.countPostsThisMonth.mockResolvedValue(5);

    await checkLimit('maxPostsPerMonth')(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('returns 403 LIMIT_REACHED when usage is at or over the limit', async () => {
    subscriptionRepository.findActivePlanByBrandId.mockResolvedValue({
      plan: { name: 'Pro', planLimit: { maxPostsPerMonth: 10 } }
    });
    subscriptionRepository.countPostsThisMonth.mockResolvedValue(10);

    await checkLimit('maxPostsPerMonth')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'LIMIT_REACHED' }));
    expect(next).not.toHaveBeenCalled();
  });
});
