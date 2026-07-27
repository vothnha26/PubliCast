const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class InboxSearchFilter extends BaseFilter {
  apply(where, queryParams) {
    const { search } = queryParams;
    if (search && search.trim()) {
      const searchKey = search.trim();
      where.OR = [
        { authorName: { contains: searchKey } },
        { content: { contains: searchKey } }
      ];
    }
  }
}

module.exports = InboxSearchFilter;
