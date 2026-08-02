/**
 * INBOX_VIEW_MODE — chế độ hiển thị chính của trang Inbox / Community.
 */
export const INBOX_VIEW_MODE = {
  BY_POST: 'by_post',
  LIST: 'list',
};

/**
 * INBOX_TAB — tab lọc theo trạng thái hội thoại (backend InboxTabFilter).
 */
export const INBOX_TAB = {
  UNRESOLVED: 'Unresolved',
  UNREAD: 'Unread',
  REPLIED: 'Replied',
  RESOLVED: 'Resolved',
  ALL: 'All',
};

export const INBOX_TABS_ORDER = [
  INBOX_TAB.UNREAD,
  INBOX_TAB.REPLIED,
  INBOX_TAB.RESOLVED,
  INBOX_TAB.ALL,
];

/**
 * POST_COMMENT_FILTER — lọc lưới Posts theo việc post có comment hay chưa.
 */
export const POST_COMMENT_FILTER = {
  ALL: 'all',
  HAS_COMMENT: 'has',
  NO_COMMENT: 'none',
};

export const POST_COMMENT_FILTER_OPTIONS = [
  { id: POST_COMMENT_FILTER.ALL, label: 'All posts' },
  { id: POST_COMMENT_FILTER.HAS_COMMENT, label: 'Has comments' },
  { id: POST_COMMENT_FILTER.NO_COMMENT, label: 'No comments' },
];

/**
 * INBOX_ITEM_TYPE — filtro theo loại item (backend InboxTypeFilter), dùng
 * cho dropdown "All / Comments / Direct Messages / Unread" trong InboxHeader.
 */
export const INBOX_ITEM_TYPE = {
  ALL: 'all',
  COMMENT: 'COMMENT',
  DIRECT_MESSAGE: 'DIRECT_MESSAGE',
  UNREAD: 'UNREAD',
  REPLIED: 'REPLIED',
  RESOLVED: 'RESOLVED',
};

export const INBOX_ITEM_TYPE_OPTIONS = [
  { id: INBOX_ITEM_TYPE.ALL, label: 'All' },
  { id: INBOX_ITEM_TYPE.COMMENT, label: 'Comments' },
  { id: INBOX_ITEM_TYPE.DIRECT_MESSAGE, label: 'Direct Messages' },
  { id: INBOX_ITEM_TYPE.UNREAD, label: 'Unread' },
  { id: INBOX_ITEM_TYPE.REPLIED, label: 'Replied' },
  { id: INBOX_ITEM_TYPE.RESOLVED, label: 'Resolved' },
];

