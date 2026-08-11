// v2 parity for the GET /calendar-events IDOR fix — verifies the v2
// controller preserves the same brand-ownership check as v1 (see
// tests/workspace/calendar-event.controller.test.js for the original
// regression coverage).

jest.mock('../../src/services/workspace/calendar-event.service', () => ({
  getEvents: jest.fn(),
  createEvent: jest.fn(),
  importIcs: jest.fn(),
  deleteEvent: jest.fn(),
  exportIcs: jest.fn()
}));

jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkBrandAccess: jest.fn()
}));

const calendarEventService = require('../../src/services/workspace/calendar-event.service');
const authorizationFacade = require('../../src/services/auth/authorization.facade');
const calendarEventControllerV2 = require('../../src/controllers/workspace/calendar-event.controller.v2');

function mockReqRes({ query = {}, body = {}, params = {}, user = { id: 'user-1' }, file } = {}) {
  const req = { query, body, params, user, file };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
    setHeader: jest.fn()
  };
  return { req, res };
}

function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    setImmediate(resolve);
  });
}

describe('CalendarEventController v2 IDOR parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('403s when brandId is supplied but the caller has no access to it (same as v1)', async () => {
    authorizationFacade.checkBrandAccess.mockResolvedValue(false);

    const { req, res } = mockReqRes({ query: { brandId: 'brand-victim', startDate: '2026-01-01', endDate: '2026-01-31' }, user: { id: 'attacker-user' } });
    await callHandler(calendarEventControllerV2.getEvents, req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(calendarEventService.getEvents).not.toHaveBeenCalled();
  });

  it('returns events wrapped under {message, data} when brandId is supplied and authorized', async () => {
    authorizationFacade.checkBrandAccess.mockResolvedValue(true);
    calendarEventService.getEvents.mockResolvedValue([{ id: 'ev-2', brandId: 'brand-abc' }]);

    const { req, res } = mockReqRes({ query: { brandId: 'brand-abc', startDate: '2026-01-01', endDate: '2026-01-31' } });
    await callHandler(calendarEventControllerV2.getEvents, req, res);

    expect(authorizationFacade.checkBrandAccess).toHaveBeenCalledWith('user-1', 'brand-abc');
    expect(res.json).toHaveBeenCalledWith({ message: 'Calendar events retrieved successfully', data: [{ id: 'ev-2', brandId: 'brand-abc' }] });
  });

  it('exportIcs streams raw ICS text, not JSON', async () => {
    calendarEventService.exportIcs.mockResolvedValue('BEGIN:VCALENDAR\nEND:VCALENDAR');

    const { req, res } = mockReqRes({ query: { brandId: 'b1', startDate: '2026-01-01', endDate: '2026-01-31' } });
    await callHandler(calendarEventControllerV2.exportIcs, req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/calendar');
    expect(res.send).toHaveBeenCalledWith('BEGIN:VCALENDAR\nEND:VCALENDAR');
  });

  it('importIcs: 400s without an uploaded file', async () => {
    const { req, res } = mockReqRes({ body: { brandId: 'b1' } });
    await callHandler(calendarEventControllerV2.importIcs, req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
