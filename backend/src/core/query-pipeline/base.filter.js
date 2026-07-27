/**
 * Abstract Base Class for Query Filters
 */
class BaseFilter {
  /**
   * Apply filter to the where object
   * @param {Object} where - Prisma where object
   * @param {Object} queryParams - Raw query parameters from request
   */
  apply(where, queryParams) {
    throw new Error('Method apply() must be implemented');
  }
}

module.exports = BaseFilter;
