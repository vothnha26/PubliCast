const BaseFilter = require('../../../../core/query-pipeline/base.filter');
const { INBOX_STATUS, INBOX_TYPES } = require('../../../../utils/constants');

/**
 * Tab filter strategies mapping (Open-Closed Principle compliant).
 */
const TAB_FILTER_STRATEGIES = {
  Unread: (where) => {
    where.status = INBOX_STATUS.UNREAD;
  },
  Unresolved: (where) => {
    where.status = { in: [INBOX_STATUS.UNREAD, INBOX_STATUS.READ, INBOX_STATUS.OPEN] };
  },
  Resolved: (where) => {
    where.status = INBOX_STATUS.RESOLVED;
  },
  Replied: (where) => {
    where.OR = [
      { repliedByUserId: { not: null } },
      { replies: { some: {} } }
    ];
  },
  Comments: (where) => {
    where.type = INBOX_TYPES.COMMENT;
  },
  DMs: (where) => {
    where.type = INBOX_TYPES.DIRECT_MESSAGE;
  },
  Mentions: (where) => {
    where.type = INBOX_TYPES.MENTION;
  }
};

class InboxTabFilter extends BaseFilter {
  apply(where, queryParams) {
    const { tab } = queryParams;
    if (!tab || !TAB_FILTER_STRATEGIES[tab]) return;

    TAB_FILTER_STRATEGIES[tab](where);
  }
}

module.exports = InboxTabFilter;
