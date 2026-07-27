const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class TeamStatusFilter extends BaseFilter {
  apply(where, queryParams) {
    const { status } = queryParams;
    if (status && status !== 'All') {
      where.status = status.toUpperCase();
    }
  }
}

module.exports = TeamStatusFilter;
