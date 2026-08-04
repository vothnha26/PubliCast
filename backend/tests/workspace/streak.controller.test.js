jest.mock('../../src/services/workspace/streak.service', () => ({
  getStreak: jest.fn()
}));

const streakService = require('../../src/services/workspace/streak.service');
const streakController = require('../../src/controllers/workspace/streak.controller');

function mockReqRes(query = {}) {
  const req = { query };
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

describe('streak.controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when brandId is missing', async () => {
    const { req, res, done } = mockReqRes({});
    await invoke(streakController.getStreak, req, res, done);

    expect(res.statusCode).toBe(400);
    expect(streakService.getStreak).not.toHaveBeenCalled();
  });

  it('returns the streak for the given brand', async () => {
    streakService.getStreak.mockResolvedValue({
      currentStreak: 4, longestStreak: 9, lastPostedDate: new Date('2026-08-05')
    });

    const { req, res, done } = mockReqRes({ brandId: 'brand-1' });
    await invoke(streakController.getStreak, req, res, done);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({ currentStreak: 4, longestStreak: 9 });
    expect(streakService.getStreak).toHaveBeenCalledWith('brand-1');
  });
});
