const userService = require('../../services/admin/user.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success, v2Error } = require('../../utils/response.helper');

class UserControllerV2 {
  listUsers = asyncHandler(async (req, res) => {
    const { page, limit, search, role } = req.query;
    const result = await userService.getUsers({ page, limit, search, role });
    v2Success(res, result, 'Lấy danh sách người dùng thành công');
  });

  changeStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const adminId = req.user.id;

    if (isActive === undefined) {
      return v2Error(res, 'Trạng thái hoạt động (isActive) là bắt buộc', 400);
    }
    if (isActive !== true && isActive !== false && isActive !== 'true' && isActive !== 'false') {
      return v2Error(res, 'Trạng thái hoạt động (isActive) phải là boolean', 400);
    }
    const isActiveBool = isActive === true || isActive === 'true';

    const updatedUser = await userService.updateUserStatus(adminId, id, isActiveBool);

    v2Success(res, updatedUser, isActiveBool ? 'Kích hoạt tài khoản thành công' : 'Vô hiệu hóa tài khoản thành công');
  });

  changeRole = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    const adminId = req.user.id;

    if (!role) {
      return v2Error(res, 'Vai trò người dùng (role) là bắt buộc', 400);
    }

    const updatedUser = await userService.updateUserRole(adminId, id, role);
    v2Success(res, updatedUser, 'Thay đổi vai trò người dùng thành công');
  });
}

module.exports = new UserControllerV2();
