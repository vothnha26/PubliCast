const prisma = require('../../config/prisma');
const roleRepository = require('../../repositories/workspace/role.repository');
const authorizationFacade = require('../auth/authorization.facade');
const { PERMISSION_KEYS } = require('../../utils/constants');

const VALID_PERMISSION_KEYS = new Set(Object.values(PERMISSION_KEYS));

/**
 * Throws a 400 if any permissionKey in `permissions` isn't a recognized
 * PERMISSION_KEYS value. PERMISSION_KEYS is the source of truth authorizationFacade
 * actually checks against at runtime, so this is what a CustomRole write must be
 * validated against (not the SystemPermission table, which is only a UI catalog).
 */
function assertValidPermissionKeys(permissions) {
  if (!permissions || permissions.length === 0) return;
  const invalidKeys = permissions
    .map((p) => p.permissionKey)
    .filter((key) => !VALID_PERMISSION_KEYS.has(key));
  if (invalidKeys.length > 0) {
    const error = new Error(`Permission key không hợp lệ: ${invalidKeys.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

class RoleService {
  /**
   * Get all custom roles in a brand
   */
  async getRoles(brandId) {
    return roleRepository.findManyByBrandId(brandId);
  }

  /**
   * Create custom role
   */
  async createRole(brandId, { name, description, colorHex, permissions }, operatorId) {
    // 1. Verify operator has MANAGE_ROLES permission
    const isAuthorized = await authorizationFacade.checkPermission(operatorId, brandId, PERMISSION_KEYS.MANAGE_ROLES);
    if (!isAuthorized) {
      const error = new Error('Bạn không có quyền quản lý vai trò trong thương hiệu này.');
      error.status = 403;
      throw error;
    }

    // 2. Reject unknown permission keys before they reach the DB
    assertValidPermissionKeys(permissions);

    // 3. Verify subscription limit (allowCustomRoles)
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        subscription: {
          include: {
            plan: {
              include: {
                planLimit: true
              }
            }
          }
        }
      }
    });

    if (!brand) {
      const error = new Error('Thương hiệu không tồn tại.');
      error.status = 404;
      throw error;
    }

    if (!brand.subscription?.plan?.planLimit?.allowCustomRoles) {
      const error = new Error('Gói dịch vụ hiện tại không hỗ trợ tạo Vai trò tùy chỉnh. Vui lòng nâng cấp gói.');
      error.status = 403;
      throw error;
    }
    // 4. Validate name, color, and name length
    if (!name || !name.trim()) {
      const error = new Error('Tên vai trò không được để trống.');
      error.status = 400;
      throw error;
    }

    if (name.trim().length > 50) {
      const error = new Error('Tên vai trò không được vượt quá 50 ký tự.');
      error.status = 400;
      throw error;
    }

    if (!colorHex || !colorHex.trim()) {
      const error = new Error('Mã màu đại diện không được để trống.');
      error.status = 400;
      throw error;
    }
    // 5. Check for duplicate role name in the same brand
    const existingRole = await roleRepository.findByName(brandId, name.trim());
    if (existingRole) {
      const error = new Error('Vai trò với tên này đã tồn tại trong thương hiệu.');
      error.status = 400;
      throw error;
    }

    // 6. Create role
    return roleRepository.create({
      brandId,
      name: name.trim(),
      description,
      colorHex: colorHex.trim(),
      permissions
    });
  }

  /**
   * Update custom role
   */
  async updateRole(brandId, roleId, { name, description, colorHex, permissions }, operatorId) {
    // 1. Verify operator has MANAGE_ROLES permission
    const isAuthorized = await authorizationFacade.checkPermission(operatorId, brandId, PERMISSION_KEYS.MANAGE_ROLES);
    if (!isAuthorized) {
      const error = new Error('Bạn không có quyền quản lý vai trò trong thương hiệu này.');
      error.status = 403;
      throw error;
    }

    // 2. Fetch role and verify ownership
    const role = await roleRepository.findById(roleId);
    if (!role || role.brandId !== brandId) {
      const error = new Error('Vai trò không tồn tại hoặc không thuộc thương hiệu này.');
      error.status = 404;
      throw error;
    }

    // 3. Reject unknown permission keys before they reach the DB
    assertValidPermissionKeys(permissions);

    // 4. Validate name, name length and color
    if (!name || !name.trim()) {
      const error = new Error('Tên vai trò không được để trống.');
      error.status = 400;
      throw error;
    }

    if (name.trim().length > 50) {
      const error = new Error('Tên vai trò không được vượt quá 50 ký tự.');
      error.status = 400;
      throw error;
    }

    if (!colorHex || !colorHex.trim()) {
      const error = new Error('Mã màu đại diện không được để trống.');
      error.status = 400;
      throw error;
    }

    // 5. Check for duplicate name (excluding itself)
    const existingRole = await roleRepository.findByName(brandId, name.trim());
    if (existingRole && existingRole.id !== roleId) {
      const error = new Error('Tên vai trò này đã được sử dụng bởi vai trò khác.');
      error.status = 400;
      throw error;
    }

    // 6. Update role
    return roleRepository.update(roleId, {
      name: name.trim(),
      description,
      colorHex: colorHex.trim(),
      permissions
    });
  }

  /**
   * Delete custom role
   */
  async deleteRole(brandId, roleId, operatorId) {
    // 1. Verify operator has MANAGE_ROLES permission
    const isAuthorized = await authorizationFacade.checkPermission(operatorId, brandId, PERMISSION_KEYS.MANAGE_ROLES);
    if (!isAuthorized) {
      const error = new Error('Bạn không có quyền quản lý vai trò trong thương hiệu này.');
      error.status = 403;
      throw error;
    }

    // 2. Fetch role and verify ownership
    const role = await roleRepository.findById(roleId);
    if (!role || role.brandId !== brandId) {
      const error = new Error('Vai trò không tồn tại hoặc không thuộc thương hiệu này.');
      error.status = 404;
      throw error;
    }

    // 3. Check if role is currently assigned to any team member
    if (role._count?.teamMembers > 0) {
      const error = new Error('Không thể xóa vai trò này vì đang có thành viên trong đội ngũ sử dụng.');
      error.status = 400;
      throw error;
    }

    // 4. Delete role
    await roleRepository.delete(roleId);
    return { message: 'Xóa vai trò thành công.' };
  }
}

module.exports = new RoleService();
