const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class InboxSocialAccountFilter extends BaseFilter {
  apply(where, queryParams) {
    const rawAccountIds = queryParams.socialAccountId || queryParams.channels;
    if (rawAccountIds && rawAccountIds !== 'All') {
      if (typeof rawAccountIds === 'string' && rawAccountIds.includes(',')) {
        where.socialAccountId = { in: rawAccountIds.split(',').filter(Boolean) };
      } else {
        where.socialAccountId = rawAccountIds;
      }
    }
  }
}

module.exports = InboxSocialAccountFilter;
