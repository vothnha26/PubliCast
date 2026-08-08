const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class PostTypeFilter extends BaseFilter {
  apply(where, queryParams) {
    const { type } = queryParams;
    if (type) {
      where.type = type.toUpperCase();
    }
  }
}

module.exports = PostTypeFilter;
