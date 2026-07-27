/**
 * Pipeline to orchestrate multiple filters on a query object
 */
class QueryPipeline {
  constructor(filters = []) {
    this.filters = filters;
  }

  /**
   * Build the Prisma query object
   * @param {Object} initialWhere - Base conditions (e.g. { brandId })
   * @param {Object} queryParams - Raw query parameters
   * @returns {Object} Final where object
   */
  apply(initialWhere, queryParams) {
    let where = { ...initialWhere };
    
    for (const filter of this.filters) {
      filter.apply(where, queryParams);
    }
    
    return where;
  }
}

module.exports = QueryPipeline;
