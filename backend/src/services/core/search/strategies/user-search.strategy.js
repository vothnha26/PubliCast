const SearchStrategy = require('./search.strategy');
const searchRepository = require('../../../../repositories/core/search.repository');
const { SEARCH_PATHS, SYSTEM_LABELS } = require('../../../../utils/constants');

class UserSearchStrategy extends SearchStrategy {
  async search(q, user) {
    const rawResults = await searchRepository.searchAllForUser(q, user.id);
    const formattedResults = [];

    // Format Users (Limited to team members)
    if (rawResults.users) {
      rawResults.users.forEach(u => {
        formattedResults.push({
          type: 'User',
          name: u.name,
          description: `${u.email} (${u.role})`,
          path: SEARCH_PATHS.SETTINGS
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

    // Format Audit Logs (Own actions)
    if (rawResults.logs) {
      rawResults.logs.forEach(l => {
        const actor = l.user?.name || SYSTEM_LABELS.SYSTEM;
        formattedResults.push({
          type: 'Audit Log',
          name: `${l.action} ${l.targetType}`,
          description: `Actor: ${actor} | Target: ${l.targetId || 'N/A'}`,
          path: SEARCH_PATHS.SETTINGS
        });
      });
    }

    return formattedResults;
  }
}

module.exports = UserSearchStrategy;
