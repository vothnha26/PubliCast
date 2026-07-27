const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class InboxPlatformFilter extends BaseFilter {
  apply(where, queryParams) {
    const { platform } = queryParams;
    if (platform && platform !== 'All') {
      where.platform = platform.toUpperCase();
    }
  }
}

module.exports = InboxPlatformFilter;
