const userService = require('../../services/admin/user.service');
const asyncHandler = require('../../utils/async-handler');

class UserController {
  /**
   * Get list of users with search, role filter and pagination
   */
  listUsers = asyncHandler(async (req, res) => {
    const { page, limit, search, role } = req.query;
    
    const result = await userService.getUsers({ page, limit, search, role });
    
    res.status(200).json({
      message: 'Lấy danh sách người dùng thành công',
      data: result
    });
  });

  /**
   * Change user status (ban/unban)
   */
  changeStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const adminId = req.user.id;

    if (isActive === undefined) {
      return res.status(400).json({ message: 'Trạng thái hoạt động (isActive) là bắt buộc' });
    }
    // Coerce explicitly instead of relying on JS truthiness — a client
    // sending the string "false" (e.g. from an HTML form or a loosely typed
    // API caller) would otherwise be treated as truthy and activate the
    // account instead of banning it.
    if (isActive !== true && isActive !== false && isActive !== 'true' && isActive !== 'false') {
      return res.status(400).json({ message: 'Trạng thái hoạt động (isActive) phải là boolean' });
    }
    const isActiveBool = isActive === true || isActive === 'true';

    const updatedUser = await userService.updateUserStatus(adminId, id, isActiveBool);

    res.status(200).json({
      message: isActiveBool ? 'Kích hoạt tài khoản thành công' : 'Vô hiệu hóa tài khoản thành công',
      data: updatedUser
    });
  });

  /**
   * Change user system role
   */
  changeRole = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    const adminId = req.user.id;

    if (!role) {
      return res.status(400).json({ message: 'Vai trò người dùng (role) là bắt buộc' });
    }

    const updatedUser = await userService.updateUserRole(adminId, id, role);

    res.status(200).json({
      message: 'Thay đổi vai trò người dùng thành công',
      data: updatedUser
    });
  });
}

module.exports = new UserController();
