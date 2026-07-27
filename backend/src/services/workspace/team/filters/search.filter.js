const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class TeamSearchFilter extends BaseFilter {
  apply(where, queryParams) {
    const { search } = queryParams;
    if (search && search.trim()) {
      const searchKey = search.trim();
      where.user = {
        OR: [
          { name: { contains: searchKey } },
          { email: { contains: searchKey } }
        ]
      };
    }
  }
}

module.exports = TeamSearchFilter;
