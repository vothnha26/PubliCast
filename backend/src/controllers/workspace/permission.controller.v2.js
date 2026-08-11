const permissionService = require('../../services/workspace/permission.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success } = require('../../utils/response.helper');

/**
 * v1's `status: 'success'` field is dropped — confirmed unused by the
 * frontend (frontend/src/services/team.service.js only reads the
 * apiV2-unwrapped `data`).
 */
class PermissionControllerV2 {
  getPermissions = asyncHandler(async (req, res) => {
    const permissions = await permissionService.getPermissions();
    v2Success(res, permissions);
  });

  createPermission = asyncHandler(async (req, res) => {
    const permission = await permissionService.createPermission(req.body);
    v2Success(res, permission, 'Tạo quyền hệ thống thành công', 201);
  });

  deletePermission = asyncHandler(async (req, res) => {
    const result = await permissionService.deletePermission(req.params.key);
    v2Success(res, null, result.message);
  });
}

module.exports = new PermissionControllerV2();
