const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class InboxSocialAccountFilter extends BaseFilter {
  apply(where, queryParams) {
    const { socialAccountId } = queryParams;
    if (socialAccountId) {
      where.socialAccountId = socialAccountId;
    }
  }
}

module.exports = InboxSocialAccountFilter;
