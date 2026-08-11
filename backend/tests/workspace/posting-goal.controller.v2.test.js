// v2 parity for posting-goal.controller.js — see
// tests/workspace/posting-goal.controller.test.js for the original v1-only
// regression coverage, including the deletePostingGoal IDOR guard.

jest.mock('../../src/config/prisma', () => ({
  postingGoal: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn()
  },
  post: {
    count: jest.fn()
  }
}));

jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkBrandAccess: jest.fn()
}));

const prisma = require('../../src/config/prisma');
const authorizationFacade = require('../../src/services/auth/authorization.facade');
const postingGoalControllerV2 = require('../../src/controllers/workspace/posting-goal.controller.v2');

function mockReqRes({ query = {}, body = {}, params = {} } = {}, userId = 'user-1') {
  const req = { query, body, params, user: { id: userId } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    setImmediate(resolve);
  });
}

describe('PostingGoalController v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getPostingGoals: returns goals wrapped under {message, data: {goals}}, matching v1', async () => {
    prisma.postingGoal.findMany.mockResolvedValue([
      { id: 'goal-1', brandId: 'brand-1', period: 'WEEKLY', targetCount: 5, updatedAt: new Date('2026-01-01') }
    ]);
    prisma.post.count.mockResolvedValue(3);

    const { req, res } = mockReqRes({ query: { brandId: 'brand-1' } });
    await callHandler(postingGoalControllerV2.getPostingGoals, req, res);

    expect(res.json).toHaveBeenCalledWith({
      message: 'Posting goals retrieved successfully',
      data: { goals: [expect.objectContaining({ id: 'goal-1', targetCount: 5, currentCount: 3 })] }
    });
  });

  it('deletePostingGoal: preserves the IDOR guard — 403s when caller lacks brand access', async () => {
    prisma.postingGoal.findUnique.mockResolvedValue({ id: 'goal-1', brandId: 'brand-victim' });
    authorizationFacade.checkBrandAccess.mockResolvedValue(false);

    const { req, res } = mockReqRes({ params: { id: 'goal-1' } }, 'attacker-user');
    await callHandler(postingGoalControllerV2.deletePostingGoal, req, res);

    expect(authorizationFacade.checkBrandAccess).toHaveBeenCalledWith('attacker-user', 'brand-victim');
    expect(res.status).toHaveBeenCalledWith(403);
    expect(prisma.postingGoal.delete).not.toHaveBeenCalled();
  });

  it('deletePostingGoal: deletes and returns data: null when authorized', async () => {
    prisma.postingGoal.findUnique.mockResolvedValue({ id: 'goal-1', brandId: 'brand-1' });
    authorizationFacade.checkBrandAccess.mockResolvedValue(true);

    const { req, res } = mockReqRes({ params: { id: 'goal-1' } });
    await callHandler(postingGoalControllerV2.deletePostingGoal, req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Posting goal deleted successfully', data: null });
  });
});
