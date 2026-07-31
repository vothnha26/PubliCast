const prisma = require('../../config/prisma');
const { PERMISSION_KEYS } = require('../../utils/constants');

class OwnerStrategy {
  async canAccess(userId, brandId) {
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, ownerId: userId, deletedAt: null }
    });
    return !!brand;
  }
}

class DefaultRoleStrategy {
  constructor() {
    this.matrix = {
      ADMIN: {
        [PERMISSION_KEYS.VIEW_ANALYTICS]: true,
        [PERMISSION_KEYS.CREATE_POSTS]: true,
        [PERMISSION_KEYS.PUBLISH_POSTS]: true,
        [PERMISSION_KEYS.APPROVE_POSTS]: true,
        [PERMISSION_KEYS.DELETE_POSTS]: true,
        [PERMISSION_KEYS.MANAGE_CONNECTIONS]: true,
        [PERMISSION_KEYS.MANAGE_TEAM]: true,
        [PERMISSION_KEYS.MANAGE_ROLES]: true,
        [PERMISSION_KEYS.INVITE_MEMBERS]: true,
        [PERMISSION_KEYS.MANAGE_MEDIA]: true,
        [PERMISSION_KEYS.CREATE_LIVESTREAM]: true,
        [PERMISSION_KEYS.MANAGE_BILLING]: true,
      },
      USER: { // USER represents Member
        [PERMISSION_KEYS.VIEW_ANALYTICS]: true,
        [PERMISSION_KEYS.CREATE_POSTS]: true,
        [PERMISSION_KEYS.PUBLISH_POSTS]: false,
        [PERMISSION_KEYS.APPROVE_POSTS]: false,
        [PERMISSION_KEYS.DELETE_POSTS]: false,
        [PERMISSION_KEYS.MANAGE_CONNECTIONS]: false,
        [PERMISSION_KEYS.MANAGE_TEAM]: false,
        [PERMISSION_KEYS.MANAGE_ROLES]: false,
        [PERMISSION_KEYS.INVITE_MEMBERS]: false,
        [PERMISSION_KEYS.MANAGE_MEDIA]: true,
        [PERMISSION_KEYS.CREATE_LIVESTREAM]: false,
        [PERMISSION_KEYS.MANAGE_BILLING]: false,
      },
      ANALYST: {
        [PERMISSION_KEYS.VIEW_ANALYTICS]: true,
        [PERMISSION_KEYS.CREATE_POSTS]: false,
        [PERMISSION_KEYS.PUBLISH_POSTS]: false,
        [PERMISSION_KEYS.APPROVE_POSTS]: false,
        [PERMISSION_KEYS.DELETE_POSTS]: false,
        [PERMISSION_KEYS.MANAGE_CONNECTIONS]: false,
        [PERMISSION_KEYS.MANAGE_TEAM]: false,
        [PERMISSION_KEYS.MANAGE_ROLES]: false,
        [PERMISSION_KEYS.INVITE_MEMBERS]: false,
        [PERMISSION_KEYS.MANAGE_MEDIA]: false,
        [PERMISSION_KEYS.CREATE_LIVESTREAM]: false,
        [PERMISSION_KEYS.MANAGE_BILLING]: false,
      }
    };
  }

  async canAccess(role, permissionKey) {
    const rolePermissions = this.matrix[role];
    if (!rolePermissions) return false;
    return !!rolePermissions[permissionKey];
  }
}

class CustomRoleStrategy {
  async canAccess(customRoleId, permissionKey) {
    if (!customRoleId) return false;
    const permission = await prisma.customRolePermission.findUnique({
      where: {
        roleId_permissionKey: {
          roleId: customRoleId,
          permissionKey
        }
      }
    });
    return permission ? permission.isAllowed : false;
  }
}

class AuthorizationFacade {
  constructor() {
    this.ownerStrategy = new OwnerStrategy();
    this.defaultRoleStrategy = new DefaultRoleStrategy();
    this.customRoleStrategy = new CustomRoleStrategy();
  }

  /**
   * Check if a user has a specific permission in a brand
   */
  async checkPermission(userId, brandId, permissionKey) {
    if (!userId || !brandId || !permissionKey) {
      return false;
    }

    // 1. Owner Strategy: Check if user is the brand owner
    const isOwner = await this.ownerStrategy.canAccess(userId, brandId);
    if (isOwner) {
      return true;
    }

    // 2. Fetch the user's membership in the brand (ensuring brand is not soft-deleted)
    const membership = await prisma.team.findFirst({
      where: {
        brandId,
        userId,
        brand: { deletedAt: null }
      }
    });

    if (!membership || membership.status !== 'ACTIVE') {
      return false;
    }

    // 3. Custom Role Strategy
    if (membership.customRoleId) {
      return this.customRoleStrategy.canAccess(membership.customRoleId, permissionKey);
    }

    // 4. Default Role Strategy
    return this.defaultRoleStrategy.canAccess(membership.role, permissionKey);
  }

  /**
   * Alias for checkPermission
   */
  async hasPermission(userId, brandId, permissionKey) {
    return this.checkPermission(userId, brandId, permissionKey);
  }

  /**
   * Check if a user has access to a brand (is owner or active member of non-deleted brand)
   */
  async checkBrandAccess(userId, brandId) {
    if (!userId || !brandId) return false;
    
    // Check if owner
    const isOwner = await this.ownerStrategy.canAccess(userId, brandId);
    if (isOwner) return true;

    // Check membership (ensuring brand is not soft-deleted)
    const membership = await prisma.team.findFirst({
      where: {
        brandId,
        userId,
        brand: { deletedAt: null }
      }
    });

    return !!membership && membership.status === 'ACTIVE';
  }
}

module.exports = new AuthorizationFacade();
