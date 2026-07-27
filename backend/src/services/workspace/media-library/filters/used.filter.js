const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class MediaLibraryUsedFilter extends BaseFilter {
  apply(where, queryParams) {
    const { used } = queryParams;
    if (used !== undefined && used !== '') {
      where.isUsed = used === 'true';
    }
  }
}

module.exports = MediaLibraryUsedFilter;
