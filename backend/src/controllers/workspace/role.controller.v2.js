const roleService = require('../../services/workspace/role.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success, v2Error } = require('../../utils/response.helper');

class RoleControllerV2 {
  getRoles = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    if (!brandId) {
      return v2Error(res, 'Missing brandId parameter', 400);
    }

    const roles = await roleService.getRoles(brandId);
    v2Success(res, roles, 'Vai trò tùy chỉnh được tải thành công');
  });

  createRole = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const { name, description, colorHex, permissions } = req.body;
    const operatorId = req.user.id;

    if (!brandId) {
      return v2Error(res, 'Missing brandId parameter', 400);
    }

    const role = await roleService.createRole(brandId, { name, description, colorHex, permissions }, operatorId);
    v2Success(res, role, 'Tạo vai trò tùy chỉnh thành công', 201);
  });

  updateRole = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const { name, description, colorHex, permissions } = req.body;
    const operatorId = req.user.id;

    if (!brandId || !id) {
      return v2Error(res, 'Missing brandId or role id parameter', 400);
    }

    const role = await roleService.updateRole(brandId, id, { name, description, colorHex, permissions }, operatorId);
    v2Success(res, role, 'Cập nhật vai trò tùy chỉnh thành công');
  });

  // Keeps v1's flat { message } shape (not wrapped under data) — the
  // underlying service returns only { message }, same as v1.
  deleteRole = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const operatorId = req.user.id;

    if (!brandId || !id) {
      return v2Error(res, 'Missing brandId or role id parameter', 400);
    }

    const result = await roleService.deleteRole(brandId, id, operatorId);
    res.status(200).json(result);
  });
}

module.exports = new RoleControllerV2();
