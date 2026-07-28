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
  const realAccount = {
    id: 'acc-fb-real',
    platformAccountId: 'page-id-real',
    accessToken: 'EAAB123456789',
    displayName: 'Real Test Page',
    profilePictureUrl: 'http://example.com/real.jpg'
  };
  const mockAccount = {
    id: 'acc-fb-mock',
    platformAccountId: 'mock-page-id',
    accessToken: 'mock-access-token',
    displayName: 'Mock Page',
    profilePictureUrl: 'http://example.com/mock.jpg'
  };
  const mockInbox = { id: 'inbox-123' };

  beforeEach(() => {
    jest.clearAllMocks();
    socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([mockAccount, realAccount]);
    inboxRepository.findOrCreateInbox.mockResolvedValue(mockInbox);
    inboxRepository.updateInboxLastSync.mockResolvedValue(true);
    inboxRepository.upsertInboxItem.mockImplementation((where, update, create) => Promise.resolve({ id: `item-${create.platformItemId}`, ...create }));
  });

  describe('FacebookCommentService.fetchChannelComments', () => {
    it('should select real account over mock account and fetch feed correctly', async () => {
      facebookGateway.getPageFeed.mockResolvedValue({
        data: [{ id: 'post-1' }],
        nextPageToken: null,
        prevPageToken: null
      });

      facebookGateway.getPostComments.mockResolvedValue([
        { id: 'c1', message: 'Comment 1', created_time: '2026-07-28T00:00:00Z', from: { id: 'user-1', name: 'User 1' } }
      ]);

      const items = await facebookCommentService.fetchChannelComments(brandId);

      expect(facebookGateway.getPageFeed).toHaveBeenCalledWith('page-id-real', 'EAAB123456789', null, 10);
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

      expect(facebookGateway.getPageFeed).toHaveBeenCalledWith('page-id-real', 'EAAB123456789', null, 10);
      expect(facebookGateway.getPostComments).not.toHaveBeenCalled();
      expect(items).toEqual([]);
    });
  });

  describe('FacebookCommentSyncStrategy.sync', () => {
    let strategy;

    beforeEach(() => {
      strategy = new FacebookCommentSyncStrategy();
    });

    it('should filter mock account and sync using real account credentials', async () => {
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

      expect(facebookGateway.getPageFeed).toHaveBeenCalledWith('page-id-real', 'EAAB123456789', null, 10);
      expect(facebookGateway.getPostComments).toHaveBeenCalledWith('post-1', 'EAAB123456789');
      expect(items).toHaveLength(1);
      expect(inboxRepository.upsertInboxItem).toHaveBeenCalledTimes(2);
    });
  });
});
