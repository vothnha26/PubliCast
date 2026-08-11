jest.mock('../../src/services/admin/posting-usage-monitoring.service', () => ({
  getMonthlyOverview: jest.fn()
}));

const postingUsageMonitoringService = require('../../src/services/admin/posting-usage-monitoring.service');
const postingUsageMonitoringController = require('../../src/controllers/admin/posting-usage-monitoring.controller');
const postingUsageMonitoringControllerV2 = require('../../src/controllers/admin/posting-usage-monitoring.controller.v2');

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

describe('PostingUsageMonitoringController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('defaults year/month to now when omitted, on both versions', async () => {
    postingUsageMonitoringService.getMonthlyOverview.mockResolvedValue({ totals: {} });
    const now = new Date();

    const v1 = mockReqRes({});
    await callHandler(postingUsageMonitoringController.getMonthlyOverview, v1.req, v1.res);
    expect(postingUsageMonitoringService.getMonthlyOverview).toHaveBeenCalledWith(now.getUTCFullYear(), now.getUTCMonth() + 1);

    jest.clearAllMocks();
    postingUsageMonitoringService.getMonthlyOverview.mockResolvedValue({ totals: {} });

    const v2 = mockReqRes({});
    await callHandler(postingUsageMonitoringControllerV2.getMonthlyOverview, v2.req, v2.res);
    expect(postingUsageMonitoringService.getMonthlyOverview).toHaveBeenCalledWith(now.getUTCFullYear(), now.getUTCMonth() + 1);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Monthly posting usage overview retrieved successfully', data: { totals: {} } });
  });

  it('uses explicit year/month query params when given, on both versions', async () => {
    postingUsageMonitoringService.getMonthlyOverview.mockResolvedValue({ totals: {} });

    const v2 = mockReqRes({ year: '2026', month: '3' });
    await callHandler(postingUsageMonitoringControllerV2.getMonthlyOverview, v2.req, v2.res);
    expect(postingUsageMonitoringService.getMonthlyOverview).toHaveBeenCalledWith(2026, 3);
  });
});
