const BaseFilter = require('../../../../core/query-pipeline/base.filter');
const { UserRole } = require('@prisma/client');

class TeamRoleFilter extends BaseFilter {
  apply(where, queryParams) {
    const { role } = queryParams;
    if (role && role !== 'All') {
      const trimmedRole = role.trim();
      let dbRole = trimmedRole.toUpperCase();
      if (dbRole === 'MEMBER') dbRole = 'USER';

      // Check if it is a valid system role (enum UserRole)
      if (Object.values(UserRole).includes(dbRole)) {
        where.role = dbRole;
      } else {
        // It's a custom role name, filter by customRole.name
        where.customRole = {
          name: trimmedRole
        };
      }
    }
  }
}

module.exports = TeamRoleFilter;
