const BaseFilter = require('../../../../core/query-pipeline/base.filter');
const { SYSTEM_LABELS } = require('../../../../utils/constants');

class AuditLogCategoryFilter extends BaseFilter {
  apply(where, queryParams) {
    const { category } = queryParams;
    if (category && category !== SYSTEM_LABELS.ALL) {
      if (category.startsWith('AUTH_') || category.startsWith('PLAN_')) {
        where.action = { startsWith: category };
      } else {
        where.targetType = category;
      }
    }
  }
}

module.exports = AuditLogCategoryFilter;
