jest.mock('../../src/services/workspace/streak.service', () => ({
  getStreak: jest.fn()
}));

const streakService = require('../../src/services/workspace/streak.service');
const streakControllerV2 = require('../../src/controllers/workspace/streak.controller.v2');

function mockReqRes(query = {}) {
  const req = { query };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    setImmediate(resolve);
  });
}

describe('StreakController v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('400s without brandId, matching v1', async () => {
    const { req, res } = mockReqRes({});
    await callHandler(streakControllerV2.getStreak, req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns the streak wrapped under {message, data}, matching v1 field selection', async () => {
    streakService.getStreak.mockResolvedValue({
      currentStreak: 4, longestStreak: 9, lastPostedDate: new Date('2026-08-05'), extraInternal: 'x'
    });

    const { req, res } = mockReqRes({ brandId: 'brand-1' });
    await callHandler(streakControllerV2.getStreak, req, res);

    expect(streakService.getStreak).toHaveBeenCalledWith('brand-1');
    expect(res.json).toHaveBeenCalledWith({
      message: 'Streak retrieved successfully',
      data: { currentStreak: 4, longestStreak: 9, lastPostedDate: new Date('2026-08-05') }
    });
  });
});
