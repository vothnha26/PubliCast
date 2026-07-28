const { filterRealAccount, processComment, processReplies } = require('../../src/services/social/facebook/facebook-comment.util');
const inboxRepository = require('../../src/repositories/social/inbox.repository');

jest.mock('../../src/repositories/social/inbox.repository');

describe('Facebook Comment Utility Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('filterRealAccount', () => {
    it('should return null when accounts list is empty or null', () => {
      expect(filterRealAccount(null)).toBeNull();
      expect(filterRealAccount([])).toBeNull();
    });

    it('should select the first real account when mock accounts are present', () => {
      const mockAccounts = [
        { id: 'mock-1', platformAccountId: 'mock-page-1', accessToken: 'mock-token-1' },
        { id: 'real-1', platformAccountId: 'real-page-1', accessToken: 'EAAB12345' }
      ];
      const selected = filterRealAccount(mockAccounts);
      expect(selected.id).toBe('real-1');
    });

    it('should fallback to first account if all accounts are mock accounts', () => {
      const mockAccounts = [
        { id: 'mock-1', platformAccountId: 'mock-page-1', accessToken: 'mock-token-1' },
        { id: 'mock-2', platformAccountId: 'mock-page-2', accessToken: 'mock-token-2' }
      ];
      const selected = filterRealAccount(mockAccounts);
      expect(selected.id).toBe('mock-1');
    });
  });

  describe('processComment & processReplies', () => {
    const mockAccount = { id: 'acc-1' };
    const mockInbox = { id: 'inbox-1' };
    const postId = 'post-100';

    it('should upsert main comment into inboxRepository correctly', async () => {
      inboxRepository.upsertInboxItem.mockResolvedValue({ id: 'db-item-1' });

      const comment = {
        id: 'c1',
        message: 'Hello World',
        created_time: '2026-07-28T00:00:00Z',
        from: { id: 'user-1', name: 'John Doe' }
      };

      const result = await processComment(comment, postId, mockAccount, mockInbox);
      expect(result.id).toBe('db-item-1');
      expect(inboxRepository.upsertInboxItem).toHaveBeenCalledWith(
        { platformItemId: 'c1' },
        expect.objectContaining({ content: 'Hello World', authorName: 'John Doe' }),
        expect.objectContaining({ platformItemId: 'c1', inboxId: 'inbox-1' })
      );
    });

    it('should upsert replies into inboxRepository correctly', async () => {
      inboxRepository.upsertInboxItem.mockResolvedValue({ id: 'db-reply-1' });

      const replies = [
        {
          id: 'r1',
          message: 'Reply message',
          created_time: '2026-07-28T01:00:00Z',
          from: { id: 'user-2', name: 'Jane Doe' }
        }
      ];

      await processReplies(replies, 'db-item-1', postId, mockAccount, mockInbox);
      expect(inboxRepository.upsertInboxItem).toHaveBeenCalledWith(
        { platformItemId: 'r1' },
        expect.objectContaining({ content: 'Reply message', authorName: 'Jane Doe' }),
        expect.objectContaining({ platformItemId: 'r1', parentItemId: 'db-item-1' })
      );
    });
  });
});
