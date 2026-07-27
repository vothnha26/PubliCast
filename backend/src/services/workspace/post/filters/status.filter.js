const BaseFilter = require('../../../../core/query-pipeline/base.filter');
const { SYSTEM_LABELS } = require('../../../../utils/constants');

class PostStatusFilter extends BaseFilter {
  apply(where, queryParams) {
    const { status } = queryParams;
    if (status && status !== SYSTEM_LABELS.ALL) {
      where.status = status.toUpperCase();
    }
  }
}

module.exports = PostStatusFilter;
