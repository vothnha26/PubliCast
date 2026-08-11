jest.mock('../../src/services/admin/user.service', () => ({
  getUsers: jest.fn(),
  updateUserStatus: jest.fn(),
  updateUserRole: jest.fn()
}));

const userService = require('../../src/services/admin/user.service');
const userController = require('../../src/controllers/admin/user.controller');
const userControllerV2 = require('../../src/controllers/admin/user.controller.v2');

function mockReqRes({ query = {}, params = {}, body = {}, user = { id: 'admin-1' } } = {}) {
  const req = { query, params, body, user };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    setImmediate(resolve);
  });
}

describe('UserController v1/v2 parity (listUsers, changeRole; changeStatus edge cases covered by #82 suite)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('listUsers: v1 and v2 both return the same paginated result', async () => {
    userService.getUsers.mockResolvedValue({ users: [{ id: 'u1' }], total: 1 });

    const v1 = mockReqRes({ query: { page: 1 } });
    await callHandler(userController.listUsers, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ message: 'Lấy danh sách người dùng thành công', data: { users: [{ id: 'u1' }], total: 1 } });

    const v2 = mockReqRes({ query: { page: 1 } });
    await callHandler(userControllerV2.listUsers, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Lấy danh sách người dùng thành công', data: { users: [{ id: 'u1' }], total: 1 } });
  });

  describe('changeStatus (v2 parity smoke test)', () => {
    it('v2 also coerces the string "false" to a real ban, matching v1', async () => {
      userService.updateUserStatus.mockResolvedValue({ id: 'u1', isActive: false });

      const v2 = mockReqRes({ params: { id: 'u1' }, body: { isActive: 'false' } });
      await callHandler(userControllerV2.changeStatus, v2.req, v2.res);
      expect(userService.updateUserStatus).toHaveBeenCalledWith('admin-1', 'u1', false);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Vô hiệu hóa tài khoản thành công', data: { id: 'u1', isActive: false } });
    });
  });

  describe('changeRole', () => {
    it('400s without role, on both versions', async () => {
      const v1 = mockReqRes({ params: { id: 'u1' }, body: {} });
      await callHandler(userController.changeRole, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({ params: { id: 'u1' }, body: {} });
      await callHandler(userControllerV2.changeRole, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });

    it('updates the role and returns it, on both versions', async () => {
      userService.updateUserRole.mockResolvedValue({ id: 'u1', role: 'ADMIN' });

      const v1 = mockReqRes({ params: { id: 'u1' }, body: { role: 'ADMIN' } });
      await callHandler(userController.changeRole, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'Thay đổi vai trò người dùng thành công', data: { id: 'u1', role: 'ADMIN' } });

      const v2 = mockReqRes({ params: { id: 'u1' }, body: { role: 'ADMIN' } });
      await callHandler(userControllerV2.changeRole, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Thay đổi vai trò người dùng thành công', data: { id: 'u1', role: 'ADMIN' } });
    });
  });
});
