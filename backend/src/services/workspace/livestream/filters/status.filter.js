const BaseFilter = require('../../../../core/query-pipeline/base.filter');
const { SYSTEM_LABELS } = require('../../../../utils/constants');

class LivestreamStatusFilter extends BaseFilter {
  apply(where, queryParams) {
    const { status } = queryParams;
    if (status && status !== SYSTEM_LABELS.ALL_STATUSES) {
      where.status = status;
    }
  }
}

module.exports = LivestreamStatusFilter;
