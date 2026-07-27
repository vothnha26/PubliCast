const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class NotificationCategoryFilter extends BaseFilter {
  apply(where, queryParams) {
    const { category } = queryParams;
    if (category && category !== 'all') {
      where.type = category;
    }
  }
}

module.exports = NotificationCategoryFilter;
