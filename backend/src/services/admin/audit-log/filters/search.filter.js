const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class AuditLogSearchFilter extends BaseFilter {
  apply(where, queryParams) {
    const { search } = queryParams;
    if (search && search.trim()) {
      const searchKey = search.trim();
      where.OR = [
        { action: { contains: searchKey } },
        { ipAddress: { contains: searchKey } },
        { targetId: { contains: searchKey } },
        { user: { name: { contains: searchKey } } }
      ];
    }
  }
}

module.exports = AuditLogSearchFilter;
