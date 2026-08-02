const facebookCommentService = require('../../src/services/social/facebook/facebook-comment.service');
const FacebookCommentSyncStrategy = require('../../src/services/social/inbox/strategies/facebook-comment.strategy');
const facebookGateway = require('../../src/services/social/facebook/facebook.gateway');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const inboxRepository = require('../../src/repositories/social/inbox.repository');
const inboxService = require('../../src/services/social/inbox.service');
const authorizationFacade = require('../../src/services/auth/authorization.facade');

jest.mock('../../src/services/social/facebook/facebook.gateway');
jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/repositories/social/inbox.repository');
jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkBrandAccess: jest.fn().mockResolvedValue(true)
}));

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

    it('should successfully fetch feed using feedResult.data and sync comments across multiple posts without crash', async () => {
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

      expect(facebookGateway.getPageFeed).toHaveBeenCalledWith('page-id-real', 'EAAB123456789', null, 10);
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
      expect(inboxRepository.upsertInboxItem).toHaveBeenCalledTimes(2); // 1 comment + 1 reply
    });

    it('should sync every top-level comment on a post, and getCommentsByPost should surface all of them (regression for #post-first-inbox thread truncation)', async () => {
      facebookGateway.getPageFeed.mockResolvedValue({
        data: [{ id: 'post-real-1' }],
        nextPageToken: null,
        prevPageToken: null
      });

      // Real Facebook Graph API shape: 3 independent top-level comments on
      // the same post, the 2nd one has a reply.
      facebookGateway.getPostComments.mockResolvedValue([
        { id: 'fbc_1', message: 'Bình luận đầu tiên', created_time: '2026-07-28T00:00:00Z', from: { id: 'u1', name: 'User A' } },
        {
          id: 'fbc_2', message: 'Bình luận thứ hai', created_time: '2026-07-28T00:05:00Z', from: { id: 'u2', name: 'User B' },
          comments: { data: [{ id: 'fbc_2_r1', message: 'Cảm ơn bạn nhé', created_time: '2026-07-28T00:10:00Z', from: { id: 'page-id-real', name: 'Real Test Page' } }] }
        },
        { id: 'fbc_3', message: 'Bình luận thứ ba', created_time: '2026-07-28T00:15:00Z', from: { id: 'u3', name: 'User C' } }
      ]);

      // Capture exactly what the sync strategy writes to the DB — this is
      // the same `create` payload processComment/processReplies build from
      // the real Graph API response above.
      const upserted = [];
      inboxRepository.upsertInboxItem.mockImplementation((where, update, create) => {
        const row = { id: `db-${create.platformItemId}`, inbox: { brandId }, replies: [], ...create };
        upserted.push(row);
        return Promise.resolve(row);
      });

      await strategy.sync(brandId, mockInbox);

      expect(inboxRepository.upsertInboxItem).toHaveBeenCalledTimes(4); // 3 top-level + 1 reply
      expect(upserted.filter(r => !r.parentItemId)).toHaveLength(3);

      // Wire the reply onto its parent's `replies` array the way Prisma's
      // `include: { replies }` would, then feed the synced rows into
      // getCommentsByPost's repository layer exactly as the real DB would
      // return them for this post.
      const [commentA, commentB, commentC] = upserted.filter(r => !r.parentItemId);
      const replyToB = upserted.find(r => r.parentItemId === commentB.id);
      commentB.replies = [replyToB];

      inboxRepository.findManyAndCount.mockResolvedValue({
        items: [commentA, commentB, commentC],
        total: 3
      });
      inboxRepository.findById.mockImplementation((id) => {
        return Promise.resolve([commentA, commentB, commentC].find(c => c.id === id));
      });
      socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValue({
        platformAccountId: 'page-id-real'
      });

      const result = await inboxService.getCommentsByPost(brandId, 'post-real-1');

      expect(result.data).toHaveLength(3);
      // commentA, commentB + its reply, commentC — all 3 real comments
      // must be present, not just the first one.
      expect(result.thread).toHaveLength(4);
      expect(result.thread.map(t => t.author)).toEqual([
        'User A', 'User B', 'Real Test Page', 'User C'
      ]);
    });
  });
});
