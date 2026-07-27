const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class AuditLogDateRangeFilter extends BaseFilter {
  apply(where, queryParams) {
    const { startDate, endDate } = queryParams;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          where.createdAt.gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          where.createdAt.lte = end;
        }
      }
    }
  }
}

module.exports = AuditLogDateRangeFilter;
