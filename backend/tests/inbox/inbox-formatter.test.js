/**
 * Regression test for #100: formatInboxListItem crashed when authorName or
 * status/type were null (e.g. a row with incomplete data), since it called
 * .charAt(0)/.toLowerCase() without a null guard.
 */
const inboxFormatter = require('../../src/services/social/inbox/inbox-formatter');

describe('InboxFormatter null-guards (#100)', () => {
  test('does not throw when authorName is null and falls back to a placeholder avatar', () => {
    const item = {
      id: '1', platform: 'FACEBOOK', authorName: null, authorAvatarUrl: null,
      content: 'hi', platformCreatedAt: new Date(), status: 'UNREAD', type: 'COMMENT',
      replies: []
    };

    expect(() => inboxFormatter.formatInboxListItem(item)).not.toThrow();
    const result = inboxFormatter.formatInboxListItem(item);
    expect(result.avatar).toBe('?');
  });

  test('does not throw when status or type are null', () => {
    const item = {
      id: '2', platform: 'FACEBOOK', authorName: 'Someone', authorAvatarUrl: null,
      content: 'hi', platformCreatedAt: new Date(), status: null, type: null,
      replies: []
    };

    expect(() => inboxFormatter.formatInboxListItem(item)).not.toThrow();
    const result = inboxFormatter.formatInboxListItem(item);
    expect(result.status).toBe('');
    expect(result.type).toBe('');
  });

  test('formats normally when all fields are present', () => {
    const item = {
      id: '3', platform: 'FACEBOOK', authorName: 'Alice', authorAvatarUrl: null,
      content: 'hi', platformCreatedAt: new Date(), status: 'READ', type: 'COMMENT',
      replies: []
    };

    const result = inboxFormatter.formatInboxListItem(item);
    expect(result.avatar).toBe('A');
    expect(result.status).toBe('read');
    expect(result.type).toBe('comment');
  });
});
