const BaseFilter = require('../../../../core/query-pipeline/base.filter');
const { INBOX_TYPES, INBOX_STATUS } = require('../../../../utils/constants');

/**
 * Filter strategy mapping for custom virtual type values.
 * Extensible for future statuses without modifying apply() logic (Open-Closed Principle).
 */
const TYPE_FILTER_STRATEGIES = {
  [INBOX_STATUS.UNREAD]: (where) => {
    where.status = INBOX_STATUS.UNREAD;
  },
  [INBOX_STATUS.RESOLVED]: (where) => {
    where.status = INBOX_STATUS.RESOLVED;
  },
  REPLIED: (where) => {
    where.OR = [
      { repliedByUserId: { not: null } },
      { replies: { some: {} } }
    ];
  }
};

class InboxTypeFilter extends BaseFilter {
  apply(where, queryParams) {
    const { type } = queryParams;
    if (!type || type === 'all') return;

    const normalizedType = type.toUpperCase();

    // 1. Execute strategy if defined (OCP compliant)
    if (TYPE_FILTER_STRATEGIES[normalizedType]) {
      TYPE_FILTER_STRATEGIES[normalizedType](where);
      return;
    }

    // 2. Only assign to where.type if it is a valid InboxItemType enum value
    if (Object.values(INBOX_TYPES).includes(normalizedType)) {
      where.type = normalizedType;
    }
  }
}

module.exports = InboxTypeFilter;
