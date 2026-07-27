const BaseFilter = require('../../../../core/query-pipeline/base.filter');
const { SYSTEM_LABELS } = require('../../../../utils/constants');

class PostPlatformFilter extends BaseFilter {
  apply(where, queryParams) {
    const { platform } = queryParams;
    if (platform && platform !== SYSTEM_LABELS.ALL_PLATFORMS) {
      where.targetPlatforms = { contains: platform };
    }
  }
}

module.exports = PostPlatformFilter;
