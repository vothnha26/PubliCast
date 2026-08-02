const BaseFilter = require('../../../../core/query-pipeline/base.filter');
const { INBOX_STATUS, INBOX_TYPES } = require('../../../../utils/constants');

class InboxTabFilter extends BaseFilter {
  apply(where, queryParams) {
    const { tab } = queryParams;
    if (tab === 'Unread') {
      where.status = INBOX_STATUS.UNREAD;
    } else if (tab === 'Unresolved') {
      where.status = { in: [INBOX_STATUS.UNREAD, INBOX_STATUS.READ, INBOX_STATUS.OPEN] };
    } else if (tab === 'Resolved') {
      where.status = INBOX_STATUS.RESOLVED;
    } else if (tab === 'Replied') {
      where.repliedByUserId = { not: null };
    } else if (tab === 'Comments') {
      where.type = INBOX_TYPES.COMMENT;
    } else if (tab === 'DMs') {
      where.type = INBOX_TYPES.DIRECT_MESSAGE;
    } else if (tab === 'Mentions') {
      where.type = INBOX_TYPES.MENTION;
    }
  }
}

module.exports = InboxTabFilter;
