jest.mock('../../src/services/admin/audit-log.service', () => ({
  getAuditLogs: jest.fn()
}));

const auditLogService = require('../../src/services/admin/audit-log.service');
const auditLogController = require('../../src/controllers/admin/audit-log.controller');
const auditLogControllerV2 = require('../../src/controllers/admin/audit-log.controller.v2');

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

describe('AuditLogController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('v1 and v2 both return the flat {message, data, meta} shape (not the nested v2 envelope)', async () => {
    auditLogService.getAuditLogs.mockResolvedValue({ data: [{ id: 'log-1' }], meta: { total: 1, page: 1, limit: 5, totalPages: 1 } });

    const v1 = mockReqRes({ page: 1 });
    await callHandler(auditLogController.getAuditLogs, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({
      message: 'Audit logs retrieved successfully',
      data: [{ id: 'log-1' }],
      meta: { total: 1, page: 1, limit: 5, totalPages: 1 }
    });

    const v2 = mockReqRes({ page: 1 });
    await callHandler(auditLogControllerV2.getAuditLogs, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({
      message: 'Audit logs retrieved successfully',
      data: [{ id: 'log-1' }],
      meta: { total: 1, page: 1, limit: 5, totalPages: 1 }
    });
  });
});
