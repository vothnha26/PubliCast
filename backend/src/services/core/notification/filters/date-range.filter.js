const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class NotificationDateRangeFilter extends BaseFilter {
  apply(where, queryParams) {
    const { startDate, endDate } = queryParams;

    if (!startDate && !endDate) return;

    const createdAt = {};

    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        createdAt.gte = start;
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        if (!String(endDate).includes('T')) {
          end.setHours(23, 59, 59, 999);
        }
        createdAt.lte = end;
      }
    }

    if (Object.keys(createdAt).length > 0) {
      where.createdAt = createdAt;
    }
  }
}

module.exports = NotificationDateRangeFilter;
