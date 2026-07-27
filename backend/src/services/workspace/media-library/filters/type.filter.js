const BaseFilter = require('../../../../core/query-pipeline/base.filter');

class MediaLibraryTypeFilter extends BaseFilter {
  apply(where, queryParams) {
    const { type } = queryParams;
    if (type && type !== 'All') {
      const typeMap = {
        'Images': 'image',
        'Videos': 'video',
        'GIFs': 'gif'
      };
      const mimePrefix = typeMap[type] || type.toLowerCase();
      where.mimeType = { contains: mimePrefix };
    }
  }
}

module.exports = MediaLibraryTypeFilter;
