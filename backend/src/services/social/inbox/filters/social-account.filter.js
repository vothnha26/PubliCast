const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class InboxSocialAccountFilter extends BaseFilter {
  apply(where, queryParams) {
    const { socialAccountId } = queryParams;
    if (socialAccountId && socialAccountId !== 'All') {
      if (typeof socialAccountId === 'string' && socialAccountId.includes(',')) {
        where.socialAccountId = { in: socialAccountId.split(',').filter(Boolean) };
      } else {
        where.socialAccountId = socialAccountId;
      }
    }
  }
}

module.exports = InboxSocialAccountFilter;
