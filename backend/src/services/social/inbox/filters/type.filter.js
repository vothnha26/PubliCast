const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class InboxTypeFilter extends BaseFilter {
  apply(where, queryParams) {
    const { type } = queryParams;
    if (type && type !== 'all') {
      where.type = type.toUpperCase();
    }
  }
}

module.exports = InboxTypeFilter;
