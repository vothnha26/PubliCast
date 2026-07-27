const BaseFilter = require('../../../../core/query-pipeline/base.filter');
const { SYSTEM_LABELS } = require('../../../../utils/constants');

class AuditLogStatusFilter extends BaseFilter {
  apply(where, queryParams) {
    const { status } = queryParams;
    if (status && status !== SYSTEM_LABELS.ALL) {
      where.details = { contains: status };
    }
  }
}

module.exports = AuditLogStatusFilter;
