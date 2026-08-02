const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class PostSocialAccountFilter extends BaseFilter {
  apply(where, queryParams) {
    const { socialAccountId } = queryParams;
    if (socialAccountId) {
      const existingOr = where.OR || [];
      where.OR = [
        ...existingOr,
        {
          networkOverrides: {
            some: {
              socialAccountId: socialAccountId
            }
          }
        },
        {
          networkOverrides: {
            none: {
              socialAccountId: { not: null }
            }
          }
        }
      ];
    }
  }
}

module.exports = PostSocialAccountFilter;
