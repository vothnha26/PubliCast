const BaseFilter = require('../../../../core/query-pipeline/base.filter');

// Filters posts down to those targeting a specific SocialAccount, via the
// PostTarget junction table (single source of truth for account targeting —
// see PostTarget in schema.prisma). Replaces an earlier version that
// inferred targeting from PostNetworkOverride, which only records an account
// when the composer's "edit by network" content customization was used and
// therefore silently matched almost every post for brands with a single
// account per platform.
class PostSocialAccountFilter extends BaseFilter {
  apply(where, queryParams) {
    const { socialAccountId } = queryParams;
    if (socialAccountId) {
      where.targets = {
        some: { socialAccountId }
      };
    }
  }
}

module.exports = PostSocialAccountFilter;
