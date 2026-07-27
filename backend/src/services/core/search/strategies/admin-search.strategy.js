const SearchStrategy = require('./search.strategy');
const searchRepository = require('../../../../repositories/core/search.repository');
const { SEARCH_PATHS, SYSTEM_LABELS } = require('../../../../utils/constants');

class AdminSearchStrategy extends SearchStrategy {
  async search(q, user) {
    const rawResults = await searchRepository.searchAllForAdmin(q);
    const formattedResults = [];

    // Format Users
    if (rawResults.users) {
      rawResults.users.forEach(u => {
        formattedResults.push({
          type: 'User',
          name: u.name,
          description: `${u.email} (${u.role})`,
          path: SEARCH_PATHS.ADMIN_AUDIT
        });
      });
    }

    // Format Brands
    if (rawResults.brands) {
      rawResults.brands.forEach(b => {
        formattedResults.push({
          type: 'Brand',
          name: b.name,
          description: 'Brand Workplace',
          path: SEARCH_PATHS.DASHBOARD
        });
      });
    }

    // Format Audit Logs
    if (rawResults.logs) {
      rawResults.logs.forEach(l => {
        const actor = l.user?.name || SYSTEM_LABELS.SYSTEM;
        formattedResults.push({
          type: 'Audit Log',
          name: `${l.action} ${l.targetType}`,
          description: `Actor: ${actor} | Target: ${l.targetId || 'N/A'}`,
          path: SEARCH_PATHS.ADMIN_AUDIT
        });
      });
    }

    return formattedResults;
  }
}

module.exports = AdminSearchStrategy;
