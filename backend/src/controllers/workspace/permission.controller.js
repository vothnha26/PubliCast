const permissionService = require('../../services/workspace/permission.service');

class PermissionController {
  async getPermissions(req, res, next) {
    try {
      const permissions = await permissionService.getPermissions();
      res.status(200).json({
        status: 'success',
        data: permissions
      });
    } catch (error) {
      next(error);
    }
  }

  async createPermission(req, res, next) {
    try {
      const permission = await permissionService.createPermission(req.body);
      res.status(201).json({
        status: 'success',
        message: 'Tạo quyền hệ thống thành công',
        data: permission
      });
    } catch (error) {
      next(error);
    }
  }

  async deletePermission(req, res, next) {
    try {
      const result = await permissionService.deletePermission(req.params.key);
      res.status(200).json({
        status: 'success',
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PermissionController();
