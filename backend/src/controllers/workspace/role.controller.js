const roleService = require('../../services/workspace/role.service');
const asyncHandler = require('../../utils/async-handler');

class RoleController {
  getRoles = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    if (!brandId) {
      return res.status(400).json({ message: 'Missing brandId parameter' });
    }

    const roles = await roleService.getRoles(brandId);
    res.status(200).json({
      message: 'Vai trò tùy chỉnh được tải thành công',
      data: roles
    });
  });

  createRole = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const { name, description, colorHex, permissions } = req.body;
    const operatorId = req.user.id;

    if (!brandId) {
      return res.status(400).json({ message: 'Missing brandId parameter' });
    }

    const role = await roleService.createRole(brandId, { name, description, colorHex, permissions }, operatorId);
    res.status(201).json({
      message: 'Tạo vai trò tùy chỉnh thành công',
      data: role
    });
  });

  updateRole = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const { name, description, colorHex, permissions } = req.body;
    const operatorId = req.user.id;

    if (!brandId || !id) {
      return res.status(400).json({ message: 'Missing brandId or role id parameter' });
    }

    const role = await roleService.updateRole(brandId, id, { name, description, colorHex, permissions }, operatorId);
    res.status(200).json({
      message: 'Cập nhật vai trò tùy chỉnh thành công',
      data: role
    });
  });

  deleteRole = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const operatorId = req.user.id;

    if (!brandId || !id) {
      return res.status(400).json({ message: 'Missing brandId or role id parameter' });
    }

    const result = await roleService.deleteRole(brandId, id, operatorId);
    res.status(200).json(result);
  });
}

module.exports = new RoleController();
