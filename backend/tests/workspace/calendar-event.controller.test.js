// Regression tests for the GET /api/calendar-events IDOR: getEvents took an
// optional brandId with zero ownership check — any authenticated user could
// pass another brand's brandId and read that brand's calendar events.

jest.mock('../../src/services/workspace/calendar-event.service', () => ({
  getEvents: jest.fn()
}));

jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkBrandAccess: jest.fn()
}));

const calendarEventService = require('../../src/services/workspace/calendar-event.service');
const authorizationFacade = require('../../src/services/auth/authorization.facade');
const calendarEventController = require('../../src/controllers/workspace/calendar-event.controller');

function mockReqRes(query, userId = 'user-1') {
  const req = { query, user: { id: userId } };
  let resolveDone;
  const done = new Promise(resolve => { resolveDone = resolve; });
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

describe('GET /api/calendar-events IDOR fix', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return events without a brand check when brandId is omitted (system events only)', async () => {
    calendarEventService.getEvents.mockResolvedValue([{ id: 'ev-1', isSystem: true }]);

    const { req, res, done } = mockReqRes({ startDate: '2026-01-01', endDate: '2026-01-31' });
    await invoke(calendarEventController.getEvents, req, res, done);

    expect(authorizationFacade.checkBrandAccess).not.toHaveBeenCalled();
    expect(res.body.data).toEqual([{ id: 'ev-1', isSystem: true }]);
  });

  it('should reject with 403 when brandId is supplied but the caller has no access to it', async () => {
    authorizationFacade.checkBrandAccess.mockResolvedValue(false);

    const { req, res, done } = mockReqRes({
      brandId: 'brand-victim',
      startDate: '2026-01-01',
      endDate: '2026-01-31'
    }, 'attacker-user');
    await invoke(calendarEventController.getEvents, req, res, done);

    expect(res.statusCode).toBe(403);
    expect(calendarEventService.getEvents).not.toHaveBeenCalled();
  });

  it('should return events when brandId is supplied and the caller belongs to it', async () => {
    authorizationFacade.checkBrandAccess.mockResolvedValue(true);
    calendarEventService.getEvents.mockResolvedValue([{ id: 'ev-2', brandId: 'brand-abc' }]);

    const { req, res, done } = mockReqRes({
      brandId: 'brand-abc',
      startDate: '2026-01-01',
      endDate: '2026-01-31'
    });
    await invoke(calendarEventController.getEvents, req, res, done);

    expect(authorizationFacade.checkBrandAccess).toHaveBeenCalledWith('user-1', 'brand-abc');
    expect(res.body.data).toEqual([{ id: 'ev-2', brandId: 'brand-abc' }]);
  });
});
