jest.mock('../../src/services/workspace/permission.service', () => ({
  getPermissions: jest.fn(),
  createPermission: jest.fn(),
  deletePermission: jest.fn()
}));

const permissionService = require('../../src/services/workspace/permission.service');
const permissionController = require('../../src/controllers/workspace/permission.controller');
const permissionControllerV2 = require('../../src/controllers/workspace/permission.controller.v2');

function mockReqRes({ params = {}, body = {} } = {}) {
  const req = { params, body };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

// v1 methods here are plain (req, res, next) async functions with manual
// try/catch (not wrapped in asyncHandler), so both v1 and v2 can be
// awaited directly.
function callHandler(handler, req, res, next) {
  return new Promise((resolve, reject) => {
    Promise.resolve(handler(req, res, next || ((err) => (err ? reject(err) : resolve())))).then(resolve, reject);
  });
}

describe('PermissionController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getPermissions: v1 returns {status, data}; v2 drops status, keeps data', async () => {
    permissionService.getPermissions.mockResolvedValue([{ key: 'manage_team' }]);

    const v1 = mockReqRes();
    await callHandler(permissionController.getPermissions, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ status: 'success', data: [{ key: 'manage_team' }] });

    const v2 = mockReqRes();
    await callHandler(permissionControllerV2.getPermissions, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Success', data: [{ key: 'manage_team' }] });
  });

  it('createPermission: both return 201', async () => {
    permissionService.createPermission.mockResolvedValue({ key: 'new_perm' });

    const v2 = mockReqRes({ body: { key: 'new_perm' } });
    await callHandler(permissionControllerV2.createPermission, v2.req, v2.res);
    expect(v2.res.status).toHaveBeenCalledWith(201);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Tạo quyền hệ thống thành công', data: { key: 'new_perm' } });
  });

  it('deletePermission: v2 wraps the service message with null data', async () => {
    permissionService.deletePermission.mockResolvedValue({ message: 'Deleted' });

    const v2 = mockReqRes({ params: { key: 'old_perm' } });
    await callHandler(permissionControllerV2.deletePermission, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Deleted', data: null });
  });
});
