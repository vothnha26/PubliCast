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
const postingGoalController = require('../../src/controllers/workspace/posting-goal.controller');

function mockReqRes({ query = {}, body = {}, params = {} } = {}, userId = 'user-1') {
  const req = { query, body, params, user: { id: userId } };
  let resolveDone;
  const done = new Promise((resolve) => { resolveDone = resolve; });
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; resolveDone(); return this; }
  };
  return { req, res, done };
}

async function invoke(controllerMethod, req, res, done) {
  controllerMethod(req, res, () => {});
  await done;
}

describe('posting-goal.controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPostingGoals', () => {
    it('returns 400 when brandId is missing', async () => {
      const { req, res, done } = mockReqRes({ query: {} });
      await invoke(postingGoalController.getPostingGoals, req, res, done);

      expect(res.statusCode).toBe(400);
      expect(prisma.postingGoal.findMany).not.toHaveBeenCalled();
    });

    it('returns goals with computed progress for the brand', async () => {
      prisma.postingGoal.findMany.mockResolvedValue([
        { id: 'goal-1', brandId: 'brand-1', period: 'WEEKLY', targetCount: 5, updatedAt: new Date('2026-01-01') }
      ]);
      prisma.post.count.mockResolvedValue(3);

      const { req, res, done } = mockReqRes({ query: { brandId: 'brand-1' } });
      await invoke(postingGoalController.getPostingGoals, req, res, done);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.goals).toHaveLength(1);
      expect(res.body.data.goals[0]).toMatchObject({
        id: 'goal-1',
        period: 'WEEKLY',
        targetCount: 5,
        currentCount: 3
      });
      expect(prisma.post.count).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ brandId: 'brand-1', status: 'PUBLISHED' })
      }));
    });

    it('returns an empty list when the brand has no goals set yet', async () => {
      prisma.postingGoal.findMany.mockResolvedValue([]);

      const { req, res, done } = mockReqRes({ query: { brandId: 'brand-1' } });
      await invoke(postingGoalController.getPostingGoals, req, res, done);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.goals).toEqual([]);
    });
  });

  describe('upsertPostingGoal', () => {
    it('returns 400 when required fields are missing', async () => {
      const { req, res, done } = mockReqRes({ body: { brandId: 'brand-1' } });
      await invoke(postingGoalController.upsertPostingGoal, req, res, done);

      expect(res.statusCode).toBe(400);
      expect(prisma.postingGoal.upsert).not.toHaveBeenCalled();
    });

    it('returns 400 when period is not WEEKLY or MONTHLY', async () => {
      const { req, res, done } = mockReqRes({
        body: { brandId: 'brand-1', period: 'DAILY', targetCount: 5 }
      });
      await invoke(postingGoalController.upsertPostingGoal, req, res, done);

      expect(res.statusCode).toBe(400);
      expect(prisma.postingGoal.upsert).not.toHaveBeenCalled();
    });

    it.each([0, -1, 1.5, NaN])('returns 400 when targetCount is not a positive integer (%p)', async (targetCount) => {
      const { req, res, done } = mockReqRes({
        body: { brandId: 'brand-1', period: 'WEEKLY', targetCount }
      });
      await invoke(postingGoalController.upsertPostingGoal, req, res, done);

      expect(res.statusCode).toBe(400);
      expect(prisma.postingGoal.upsert).not.toHaveBeenCalled();
    });

    it('upserts the goal and returns it with current progress', async () => {
      prisma.postingGoal.upsert.mockResolvedValue({
        id: 'goal-1', brandId: 'brand-1', period: 'MONTHLY', targetCount: 20
      });
      prisma.post.count.mockResolvedValue(7);

      const { req, res, done } = mockReqRes({
        body: { brandId: 'brand-1', period: 'MONTHLY', targetCount: 20 }
      });
      await invoke(postingGoalController.upsertPostingGoal, req, res, done);

      expect(res.statusCode).toBe(200);
      expect(prisma.postingGoal.upsert).toHaveBeenCalledWith({
        where: { brandId_period: { brandId: 'brand-1', period: 'MONTHLY' } },
        update: { targetCount: 20 },
        create: { brandId: 'brand-1', period: 'MONTHLY', targetCount: 20 }
      });
      expect(res.body.data).toMatchObject({ id: 'goal-1', targetCount: 20, currentCount: 7 });
    });
  });

  describe('deletePostingGoal', () => {
    it('returns 404 when the goal does not exist', async () => {
      prisma.postingGoal.findUnique.mockResolvedValue(null);

      const { req, res, done } = mockReqRes({ params: { id: 'missing-goal' } });
      await invoke(postingGoalController.deletePostingGoal, req, res, done);

      expect(res.statusCode).toBe(404);
      expect(prisma.postingGoal.delete).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller has no access to the goal\'s brand (IDOR guard)', async () => {
      prisma.postingGoal.findUnique.mockResolvedValue({ id: 'goal-1', brandId: 'brand-victim' });
      authorizationFacade.checkBrandAccess.mockResolvedValue(false);

      const { req, res, done } = mockReqRes({ params: { id: 'goal-1' } }, 'attacker-user');
      await invoke(postingGoalController.deletePostingGoal, req, res, done);

      expect(authorizationFacade.checkBrandAccess).toHaveBeenCalledWith('attacker-user', 'brand-victim');
      expect(res.statusCode).toBe(403);
      expect(prisma.postingGoal.delete).not.toHaveBeenCalled();
    });

    it('deletes the goal when the caller has access', async () => {
      prisma.postingGoal.findUnique.mockResolvedValue({ id: 'goal-1', brandId: 'brand-1' });
      authorizationFacade.checkBrandAccess.mockResolvedValue(true);

      const { req, res, done } = mockReqRes({ params: { id: 'goal-1' } });
      await invoke(postingGoalController.deletePostingGoal, req, res, done);

      expect(res.statusCode).toBe(200);
      expect(prisma.postingGoal.delete).toHaveBeenCalledWith({ where: { id: 'goal-1' } });
    });
  });
});
