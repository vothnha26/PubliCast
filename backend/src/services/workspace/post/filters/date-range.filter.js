const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class PostDateRangeFilter extends BaseFilter {
  apply(where, queryParams) {
    const { startDate, endDate } = queryParams;
    
    if (startDate || endDate) {
      let start = null;
      let end = null;
      
      if (startDate) {
        start = new Date(startDate);
        if (isNaN(start.getTime())) {
          start = null;
        } else {
          start.setUTCHours(0, 0, 0, 0);
        }
      }
      
      if (endDate) {
        end = new Date(endDate);
        if (isNaN(end.getTime())) {
          end = null;
        } else {
          end.setUTCHours(23, 59, 59, 999);
        }
      }

      const dateFilters = [];
      
      if (start) {
        dateFilters.push({
          OR: [
            {
              scheduledAt: { gte: start }
            },
            {
              scheduledAt: null,
              createdAt: { gte: start }
            }
          ]
        });
      }
      
      if (end) {
        dateFilters.push({
          OR: [
            {
              scheduledAt: { lte: end }
            },
            {
              scheduledAt: null,
              createdAt: { lte: end }
            }
          ]
        });
      }

      if (dateFilters.length > 0) {
        if (!where.AND) {
          where.AND = [];
        }
        where.AND.push(...dateFilters);
      }
    }
  }
}

module.exports = PostDateRangeFilter;
