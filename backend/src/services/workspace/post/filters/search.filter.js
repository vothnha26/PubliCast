const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class PostSearchFilter extends BaseFilter {
  apply(where, queryParams) {
    const { search } = queryParams;
    if (search && search.trim()) {
      const searchKey = search.trim();
      where.OR = [
        { title: { contains: searchKey } },
        { caption: { contains: searchKey } }
      ];
    }
  }
}

module.exports = PostSearchFilter;
