const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class MediaLibrarySearchFilter extends BaseFilter {
  apply(where, queryParams) {
    const { search } = queryParams;
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { filename: { contains: term } },
        { tags: { contains: term } }
      ];
    }
  }
}

module.exports = MediaLibrarySearchFilter;
