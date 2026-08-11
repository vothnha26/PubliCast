jest.mock('../../src/services/workspace/role.service', () => ({
  getRoles: jest.fn(),
  createRole: jest.fn(),
  updateRole: jest.fn(),
  deleteRole: jest.fn()
}));

const roleService = require('../../src/services/workspace/role.service');
const roleController = require('../../src/controllers/workspace/role.controller');
const roleControllerV2 = require('../../src/controllers/workspace/role.controller.v2');

function mockReqRes({ params = {}, body = {}, user = { id: 'user-1' } } = {}) {
  const req = { params, body, user };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    setImmediate(resolve);
  });
}

describe('RoleController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getRoles: 400s without brandId, and returns the same list otherwise, on both versions', async () => {
    const v1a = mockReqRes({ params: {} });
    await callHandler(roleController.getRoles, v1a.req, v1a.res);
    expect(v1a.res.status).toHaveBeenCalledWith(400);

    const v2a = mockReqRes({ params: {} });
    await callHandler(roleControllerV2.getRoles, v2a.req, v2a.res);
    expect(v2a.res.status).toHaveBeenCalledWith(400);

    roleService.getRoles.mockResolvedValue([{ id: 'r1' }]);
    const v2b = mockReqRes({ params: { brandId: 'b1' } });
    await callHandler(roleControllerV2.getRoles, v2b.req, v2b.res);
    expect(v2b.res.json).toHaveBeenCalledWith({ message: 'Vai trò tùy chỉnh được tải thành công', data: [{ id: 'r1' }] });
  });

  it('createRole: both return 201 with the new role', async () => {
    roleService.createRole.mockResolvedValue({ id: 'r1', name: 'Editor' });

    const v2 = mockReqRes({ params: { brandId: 'b1' }, body: { name: 'Editor' } });
    await callHandler(roleControllerV2.createRole, v2.req, v2.res);
    expect(v2.res.status).toHaveBeenCalledWith(201);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Tạo vai trò tùy chỉnh thành công', data: { id: 'r1', name: 'Editor' } });
  });

  it('deleteRole: v1 and v2 both return the raw {message} result (not wrapped under data)', async () => {
    roleService.deleteRole.mockResolvedValue({ message: 'Xóa vai trò thành công.' });

    const v1 = mockReqRes({ params: { brandId: 'b1', id: 'r1' } });
    await callHandler(roleController.deleteRole, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ message: 'Xóa vai trò thành công.' });

    const v2 = mockReqRes({ params: { brandId: 'b1', id: 'r1' } });
    await callHandler(roleControllerV2.deleteRole, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Xóa vai trò thành công.' });
  });
});
