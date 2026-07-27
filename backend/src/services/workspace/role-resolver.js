const roleRepository = require('../../repositories/workspace/role.repository');
const { USER_ROLES } = require('../../utils/constants');

class RoleResolver {
  /**
   * Resolve role inputs into standard dbRole and customRoleId
   * @param {string} roleInput - Role name or Custom Role ID
   * @param {string} brandId - Brand ID context
   * @returns {Promise<{ dbRole: string, customRoleId: string|null }>}
   */
  async resolve(roleInput, brandId) {
    if (!roleInput) {
      return {
        dbRole: USER_ROLES.USER,
        customRoleId: null
      };
    }

    // 1. Check if roleInput is a custom role ID belonging to this brand
    const customRole = await roleRepository.findById(roleInput);
    if (customRole && customRole.brandId === brandId) {
      return {
        dbRole: USER_ROLES.USER, // Fallback system role for custom roles
        customRoleId: customRole.id
      };
    }

    // 2. Map default system roles
    let dbRole;
    switch (roleInput) {
      case 'Admin':
      case USER_ROLES.ADMIN:
        dbRole = USER_ROLES.ADMIN;
        break;
      case 'Analyst':
      case USER_ROLES.ANALYST:
        dbRole = USER_ROLES.ANALYST;
        break;
      default:
        dbRole = USER_ROLES.USER;
    }

    return {
      dbRole,
      customRoleId: null
    };
  }
}

module.exports = new RoleResolver();
