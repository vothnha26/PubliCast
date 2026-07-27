const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class InboxStatusFilter extends BaseFilter {
  apply(where, queryParams) {
    const { status } = queryParams;
    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }
  }
}

module.exports = InboxStatusFilter;
