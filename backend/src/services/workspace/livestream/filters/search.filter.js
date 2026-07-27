const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class LivestreamSearchFilter extends BaseFilter {
  apply(where, queryParams) {
    const { search } = queryParams;
    if (search && search.trim()) {
      const searchKey = search.trim();
      where.OR = [
        { title: { contains: searchKey } },
        { description: { contains: searchKey } }
      ];
    }
  }
}

module.exports = LivestreamSearchFilter;
