/**
 * Interface for Search Strategies
 */
class SearchStrategy {
  /**
   * Execute search based on query and user context
   * @param {string} q - Search query
   * @param {Object} user - User context
   */
  async search(q, user) {
    throw new Error('Method search() must be implemented');
  }
}

module.exports = SearchStrategy;
