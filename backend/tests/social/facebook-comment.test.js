const facebookCommentService = require('../../src/services/social/facebook/facebook-comment.service');
const FacebookCommentSyncStrategy = require('../../src/services/social/inbox/strategies/facebook-comment.strategy');
const facebookGateway = require('../../src/services/social/facebook/facebook.gateway');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const inboxRepository = require('../../src/repositories/social/inbox.repository');

jest.mock('../../src/services/social/facebook/facebook.gateway');
jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/repositories/social/inbox.repository');

describe('Facebook Comment Sync & Service Unit Tests', () => {
  const brandId = 'brand-fb-123';
  const mockAccount = {
    id: 'acc-fb-1',
    platformAccountId: 'page-id-123',
    accessToken: 'page-access-token-123',
    displayName: 'Test Page',
    profilePictureUrl: 'http://example.com/avatar.jpg'
  };
  const mockInbox = { id: 'inbox-123' };

  beforeEach(() => {
    jest.clearAllMocks();
    socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([mockAccount]);
    inboxRepository.findOrCreateInbox.mockResolvedValue(mockInbox);
    inboxRepository.updateInboxLastSync.mockResolvedValue(true);
    inboxRepository.upsertInboxItem.mockImplementation((where, update, create) => Promise.resolve({ id: `item-${create.platformItemId}`, ...create }));
  });

  describe('FacebookCommentService.fetchChannelComments', () => {
    it('should successfully fetch feed using feedResult.data and sync comments without crash', async () => {
      facebookGateway.getPageFeed.mockResolvedValue({
        data: [{ id: 'post-1' }, { id: 'post-2' }],
        nextPageToken: null,
        prevPageToken: null
      });

      facebookGateway.getPostComments.mockImplementation((postId) => {
        if (postId === 'post-1') {
          return Promise.resolve([
            { id: 'c1', message: 'Comment 1', created_time: '2026-07-28T00:00:00Z', from: { id: 'user-1', name: 'User 1' } }
          ]);
        }
        return Promise.resolve([]);
      });

      const items = await facebookCommentService.fetchChannelComments(brandId);

      expect(facebookGateway.getPageFeed).toHaveBeenCalledWith('page-id-123', 'page-access-token-123', null, 10);
      expect(facebookGateway.getPostComments).toHaveBeenCalledTimes(2);
      expect(items).toHaveLength(1);
      expect(items[0].platformItemId).toBe('c1');
    });

    it('should handle empty feedResult.data gracefully', async () => {
      facebookGateway.getPageFeed.mockResolvedValue({
        data: [],
        nextPageToken: null,
        prevPageToken: null
      });

      const items = await facebookCommentService.fetchChannelComments(brandId);

      expect(facebookGateway.getPageFeed).toHaveBeenCalledWith('page-id-123', 'page-access-token-123', null, 10);
      expect(facebookGateway.getPostComments).not.toHaveBeenCalled();
      expect(items).toEqual([]);
    });
  });

  describe('FacebookCommentSyncStrategy.sync', () => {
    let strategy;

    beforeEach(() => {
      strategy = new FacebookCommentSyncStrategy();
    });

    it('should successfully sync feed using feedResult.data without crash', async () => {
      facebookGateway.getPageFeed.mockResolvedValue({
        data: [{ id: 'post-1' }],
        nextPageToken: null,
        prevPageToken: null
      });

      facebookGateway.getPostComments.mockResolvedValue([
        {
          id: 'c1',
          message: 'Comment 1',
          created_time: '2026-07-28T00:00:00Z',
          from: { id: 'u1', name: 'User 1' },
          comments: {
            data: [
              { id: 'r1', message: 'Reply 1', created_time: '2026-07-28T01:00:00Z', from: { id: 'u2', name: 'User 2' } }
            ]
          }
        }
      ]);

      const items = await strategy.sync(brandId, mockInbox);

      expect(facebookGateway.getPageFeed).toHaveBeenCalledWith('page-id-123', 'page-access-token-123', null, 10);
      expect(facebookGateway.getPostComments).toHaveBeenCalledWith('post-1', 'page-access-token-123');
      expect(items).toHaveLength(1);
      expect(inboxRepository.upsertInboxItem).toHaveBeenCalledTimes(2); // 1 comment + 1 reply
    });
  });
});
