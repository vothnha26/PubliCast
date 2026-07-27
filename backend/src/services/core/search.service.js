const AdminSearchStrategy = require('./search/strategies/admin-search.strategy');
const UserSearchStrategy = require('./search/strategies/user-search.strategy');

class SearchService {
  constructor() {
    this.strategies = {
      ADMIN: new AdminSearchStrategy(),
      DEFAULT: new UserSearchStrategy()
    };
  }

  /**
   * Search all entities based on user role using Strategy Pattern
   * @param {string} q Search query string
   * @param {Object} user Decoded token user object { id, role }
   */
  async searchAll(q, user) {
    if (!q || !q.trim()) {
      return [];
    }

    const query = q.trim();
    const strategy = this.strategies[user.role] || this.strategies.DEFAULT;

    return await strategy.search(query, user);
  }
}

module.exports = new SearchService();
