const BaseFilter = require('../../../../core/query-pipeline/base.filter');
const { INBOX_TYPES, INBOX_STATUS } = require('../../../../utils/constants');

class InboxTypeFilter extends BaseFilter {
  apply(where, queryParams) {
    const { type } = queryParams;
    if (!type || type === 'all') return;

    const normalizedType = type.toUpperCase();

    // Map status filters (e.g. UNREAD) passed via type parameter to status field
    if (normalizedType === INBOX_STATUS.UNREAD) {
      where.status = INBOX_STATUS.UNREAD;
      return;
    }

    // Only assign to where.type if it is a valid InboxItemType enum value
    if (Object.values(INBOX_TYPES).includes(normalizedType)) {
      where.type = normalizedType;
    }
  }
}

module.exports = InboxTypeFilter;
