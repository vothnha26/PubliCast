const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class LivestreamDateRangeFilter extends BaseFilter {
  apply(where, queryParams) {
    const { startDate, endDate } = queryParams;
    
    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          where.scheduledAt.gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          where.scheduledAt.lte = end;
        }
      }
    }
  }
}

module.exports = LivestreamDateRangeFilter;
