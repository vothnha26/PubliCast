const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class PostDeletedFilter extends BaseFilter {
  apply(where, queryParams) {
    const { isDeleted } = queryParams;
    where.isDeleted = isDeleted === 'true' || isDeleted === true;
  }
}

module.exports = PostDeletedFilter;
