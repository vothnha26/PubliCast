jest.mock('../../src/services/admin/platform-limit.service', () => ({
  getPlatformLimits: jest.fn(),
  getPlatformLimitById: jest.fn(),
  createPlatformLimit: jest.fn(),
  updatePlatformLimit: jest.fn(),
  toggleLock: jest.fn(),
  deletePlatformLimit: jest.fn()
}));

const platformLimitService = require('../../src/services/admin/platform-limit.service');
const platformLimitController = require('../../src/controllers/admin/platform-limit.controller');
const platformLimitControllerV2 = require('../../src/controllers/admin/platform-limit.controller.v2');

function mockReqRes({ params = {}, body = {} } = {}) {
  const req = { params, body };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    setImmediate(resolve);
  });
}

describe('PlatformLimitController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getPlatformLimits: v1 and v2 both return the same limits list', async () => {
    platformLimitService.getPlatformLimits.mockResolvedValue([{ id: 'l1' }]);

    const v1 = mockReqRes();
    await callHandler(platformLimitController.getPlatformLimits, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ message: 'Platform limits retrieved successfully', data: [{ id: 'l1' }] });

    const v2 = mockReqRes();
    await callHandler(platformLimitControllerV2.getPlatformLimits, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Platform limits retrieved successfully', data: [{ id: 'l1' }] });
  });

  it('createPlatformLimit: both return 201', async () => {
    platformLimitService.createPlatformLimit.mockResolvedValue({ id: 'l1' });

    const v2 = mockReqRes({ body: { platform: 'FACEBOOK', dailyLimit: 35 } });
    await callHandler(platformLimitControllerV2.createPlatformLimit, v2.req, v2.res);
    expect(v2.res.status).toHaveBeenCalledWith(201);
  });

  it('toggleLock: message reflects locked/unlocked state on both versions', async () => {
    platformLimitService.toggleLock.mockResolvedValue({ id: 'l1', isLocked: true });

    const v1 = mockReqRes({ params: { id: 'l1' }, body: { isLocked: true, lockReason: 'abuse' } });
    await callHandler(platformLimitController.toggleLock, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ message: 'Platform limit configuration locked successfully', data: { id: 'l1', isLocked: true } });

    const v2 = mockReqRes({ params: { id: 'l1' }, body: { isLocked: true, lockReason: 'abuse' } });
    await callHandler(platformLimitControllerV2.toggleLock, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Platform limit configuration locked successfully', data: { id: 'l1', isLocked: true } });
  });

  it('deletePlatformLimit: both forward id and return the deleted record', async () => {
    platformLimitService.deletePlatformLimit.mockResolvedValue({ id: 'l1' });

    const v2 = mockReqRes({ params: { id: 'l1' } });
    await callHandler(platformLimitControllerV2.deletePlatformLimit, v2.req, v2.res);
    expect(platformLimitService.deletePlatformLimit).toHaveBeenCalledWith('l1');
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Platform limit configuration deleted successfully', data: { id: 'l1' } });
  });
});
