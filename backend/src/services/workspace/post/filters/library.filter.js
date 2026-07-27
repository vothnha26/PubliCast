const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class PostLibraryFilter extends BaseFilter {
  apply(where, queryParams) {
    const { isLibrary } = queryParams;
    where.isLibrary = isLibrary === 'true' || isLibrary === true;
  }
}

module.exports = PostLibraryFilter;
