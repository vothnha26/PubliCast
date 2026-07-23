jest.mock('../../src/services/admin/user.service', () => ({
  updateUserStatus: jest.fn()
}));

const userService = require('../../src/services/admin/user.service');
const userController = require('../../src/controllers/admin/user.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('UserController#changeStatus (#82)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rejects when isActive is missing', async () => {
    const req = { params: { id: 'user-1' }, body: {}, user: { id: 'admin-1' } };
    const res = mockRes();

    await userController.changeStatus(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(userService.updateUserStatus).not.toHaveBeenCalled();
  });

  it('rejects a non-boolean isActive instead of coercing via JS truthiness', async () => {
    const req = { params: { id: 'user-1' }, body: { isActive: 'not-a-boolean' }, user: { id: 'admin-1' } };
    const res = mockRes();

    await userController.changeStatus(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(userService.updateUserStatus).not.toHaveBeenCalled();
  });

  it('treats the string "false" as false, not truthy', async () => {
    const req = { params: { id: 'user-1' }, body: { isActive: 'false' }, user: { id: 'admin-1' } };
    const res = mockRes();
    userService.updateUserStatus.mockResolvedValue({ id: 'user-1', isActive: false });

    await userController.changeStatus(req, res, jest.fn());

    expect(userService.updateUserStatus).toHaveBeenCalledWith('admin-1', 'user-1', false);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Vô hiệu hóa tài khoản thành công' })
    );
  });

  it('accepts a real boolean true', async () => {
    const req = { params: { id: 'user-1' }, body: { isActive: true }, user: { id: 'admin-1' } };
    const res = mockRes();
    userService.updateUserStatus.mockResolvedValue({ id: 'user-1', isActive: true });

    await userController.changeStatus(req, res, jest.fn());

    expect(userService.updateUserStatus).toHaveBeenCalledWith('admin-1', 'user-1', true);
  });
});
