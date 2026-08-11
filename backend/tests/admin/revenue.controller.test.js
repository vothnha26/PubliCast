jest.mock('../../src/services/admin/revenue.service', () => ({
  getDashboardData: jest.fn()
}));

const revenueService = require('../../src/services/admin/revenue.service');
const revenueController = require('../../src/controllers/admin/revenue.controller');
const revenueControllerV2 = require('../../src/controllers/admin/revenue.controller.v2');

function mockReqRes() {
  const req = {};
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    setImmediate(resolve);
  });
}

describe('RevenueController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('v1 and v2 both return the same dashboard data', async () => {
    revenueService.getDashboardData.mockResolvedValue({ mrr: 5000, arr: 60000 });

    const v1 = mockReqRes();
    await callHandler(revenueController.getRevenueDashboard, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ message: 'Revenue dashboard data retrieved successfully', data: { mrr: 5000, arr: 60000 } });

    const v2 = mockReqRes();
    await callHandler(revenueControllerV2.getRevenueDashboard, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Revenue dashboard data retrieved successfully', data: { mrr: 5000, arr: 60000 } });
  });
});
